# RV — Remuneração Variável

## Visão geral

Sistema de **estimativa de RV** (Remuneração Variável) do operador. 
Calcula em tempo real, baseado nos dados de KPI já salvos no banco, 
um valor aproximado do bônus mensal do operador.

O sistema NÃO substitui o cálculo oficial da empresa — é uma 
**ferramenta de transparência e acompanhamento** pro operador entender 
o que ele ganhou, perdeu e ainda pode ganhar.

## Conceito do RV

O RV é calculado em 5 etapas:

**Etapa 0 — Status do operador (pré-check)**

Antes de qualquer cálculo, verifica `meta_status` do snapshot do operador 
no mês. Se status ≠ "ativo", RV = R$ 0 com motivo específico:

- "férias" → "Operador em férias neste mês — RV não aplicável"
- "desligado" → "Operador desligado — RV não aplicável"
- "licença" → "Operador em licença — RV não aplicável"
- qualquer outro valor não reconhecido → "Status do operador: [valor] — RV não calculado"

Se status = "ativo" (ou se status não estiver preenchido), prossegue 
para Etapa 1 (Elegibilidade).

**Etapa 1 — Elegibilidade (porta de entrada)**

Se o operador não passa nas regras de elegibilidade (tempo logado, 
suspensão, etc.), RV = R$ 0. Etapas seguintes nem rodam.

**Etapa 2 — Soma de indicadores (bruto)**

Cada indicador atingido soma valor:
- **Tx Retenção (faixas):** R$ 700 / R$ 400 / R$ 300 / R$ 200 (conforme faixa)
- **Operacional - Pausas ≤ 14.5%:** +R$ 150
- **Operacional - TMA ≤ 12:11:** +R$ 150
- **Variação Ticket (faixas):** R$ 200 / R$ 150 / R$ 100 / R$ 50 (só se Tx Retenção ≥ 60%)
- **Bônus Desempenho** (3 condições simultâneas): +R$ 300

Soma de tudo = **bruto**

**Etapa 3 — Multiplicador de Pedidos**

`subtotal = bruto × min(% pedidos atingidos, 100%)`

Se atingiu 90% da meta de Pedidos: subtotal = bruto × 0.9
Se atingiu 130%: trava em 100%, subtotal = bruto × 1.0

**Etapa 4 — Deflatores**

`líquido = subtotal × (1 - soma_deflatores_aplicados)`

Deflatores são descontos percentuais sobre o subtotal. Podem ser:
- **Automáticos:** TMA fora, Pausas fora (sistema calcula)
- **Manuais:** Erro de procedimento, advertência, etc. (ADM cadastra)

## Estrutura de rotas

```
/config/rv                       ← ADM configura tudo (tabs)
├── Tab "Regras"                 ← Faixas, indicadores, multiplicador, teto, tipos de deflator
└── Tab "Aplicar Deflator"       ← ADM marca quem perdeu o quê no mês

/rv/atual                        ← Operador vê estimativa do mês atual
/rv/passado                      ← Operador vê estimativa do mês passado
```

## Sidebar

Adicionar nova seção abaixo do KPI:

```
📊 KPI
   Mês Atual
   Mês Passado

💰 RV
   Estimativa Atual
   Estimativa Passado

⚙️ Configurações
   KPI
   RV
```

A entrada "Aplicar Deflator" **NÃO aparece na sidebar** — só é acessível 
via tab dentro de `/config/rv`.

## Quem acessa

- **OP / AUX / ADM** → veem `/rv/atual` e `/rv/passado` (cada um vê só seu RV)
- **ADM** → tem acesso a `/config/rv` (configuração de regras + aplicar deflatores)
- **GESTOR** → redirecionado para `/gestor/d-1` (RV de gestor é diferente — implementação futura)

## Modelo de dados

### Tabela `rv_rule_sets`

Conjunto de regras de RV. Sempre 2 conjuntos: "current" (mês atual) e 
"previous" (mês passado).

```sql
create table rv_rule_sets (
  id uuid primary key default gen_random_uuid(),
  scope text not null unique check (scope in ('current', 'previous')),
  teto_base numeric not null default 1200,
  multiplicador_max_pct numeric not null default 100,
  updated_at timestamptz default now()
);

-- Seed inicial (ambos os scopes com defaults)
insert into rv_rule_sets (scope, teto_base, multiplicador_max_pct) values 
  ('current', 1200, 100),
  ('previous', 1200, 100);
```

### Tabela `rv_eligibility_rules`

Regras de elegibilidade. Se qualquer uma falhar, RV = 0.

```sql
create table rv_eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references rv_rule_sets(id) on delete cascade,
  display_name text not null,                  -- "Tempo logado"
  kpi_slug text,                                -- "tempo_logado_pct" ou null se manual
  comparison text not null check (comparison in ('gte', 'lte', 'eq', 'lt', 'gt')),
  threshold numeric not null,                  -- 95 (significa 95%)
  display_order int not null default 0
);
```

### Tabela `rv_tiered_indicators`

Indicadores com **faixas de valor** (Tx Retenção, Variação Ticket).

```sql
create table rv_tiered_indicators (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references rv_rule_sets(id) on delete cascade,
  slug text not null,                          -- "tx_retencao", "variacao_ticket"
  display_name text not null,                  -- "Tx Retenção"
  kpi_slug text not null,                      -- aponta pro kpi_slug em kpi_monthly_snapshots
  direction text not null check (direction in ('higher_better', 'lower_better', 'closer_to_zero')),
  -- Faixas armazenadas como JSON ordenado da mais alta pra mais baixa
  -- [{ "threshold": 66, "value": 700 }, { "threshold": 63, "value": 400 }, ...]
  faixas jsonb not null default '[]'::jsonb,
  -- Pré-requisito: outro indicador binário/tiered que precisa ter sido atingido
  -- Ex: Variação Ticket só vale se Tx Retenção ≥ 60%
  requires_indicator_slug text,
  requires_threshold numeric,
  display_order int not null default 0
);
```

### Tabela `rv_binary_indicators`

Indicadores binários (atingiu ou não).

```sql
create table rv_binary_indicators (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references rv_rule_sets(id) on delete cascade,
  slug text not null,                          -- "operacional_pausas", "operacional_tma"
  display_name text not null,                  -- "Pausas ≤ 14.5%"
  kpi_slug text not null,                      -- aponta pro kpi_slug em kpi_monthly_snapshots
  comparison text not null check (comparison in ('gte', 'lte', 'eq')),
  threshold numeric not null,
  value_if_achieved numeric not null,          -- R$ 150
  display_order int not null default 0
);
```

### Tabela `rv_combined_bonus`

Bônus de Desempenho — várias condições simultâneas dão valor extra.

```sql
create table rv_combined_bonus (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references rv_rule_sets(id) on delete cascade,
  display_name text not null default 'Bônus de Desempenho',
  -- Condições armazenadas como JSON
  -- [{ "kpi_slug": "tx_retencao_bruta", "comparison": "gte", "threshold": 66 }, ...]
  conditions jsonb not null default '[]'::jsonb,
  value_if_all_achieved numeric not null default 300,
  display_order int not null default 0
);
```

### Tabela `rv_multiplier`

Multiplicador final do bruto (atualmente: Pedidos).

```sql
create table rv_multiplier (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references rv_rule_sets(id) on delete cascade,
  display_name text not null default 'Pedidos',
  kpi_slug text not null,                       -- "pedidos"
  forecast_kpi_slug text not null,              -- "forecast_pedidos"
  cap_at_100_pct boolean not null default true  -- se true, trava em 100%
);
```

### Tabela `rv_deflator_types`

Tipos de deflator cadastrados pelo ADM.

```sql
create table rv_deflator_types (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references rv_rule_sets(id) on delete cascade,
  display_name text not null,                  -- "Erro de procedimento"
  initial_percent numeric not null,            -- 30 (significa -30%)
  increment_per_occurrence numeric not null default 0,   -- 10 (cada ocorrência adicional soma -10%)
  auto_from_kpi_slug text,                     -- se preenchido, deflator é automático
  auto_comparison text check (auto_comparison in ('gte', 'lte', 'eq')),
  auto_threshold numeric,
  display_order int not null default 0
);
```

**Lógica de auto-deflator:** se `auto_from_kpi_slug` está preenchido, o 
sistema aplica automaticamente quando o operador não atinge a condição. 
Ex: TMA > 12:11 dispara -15% sem precisar de cadastro manual.

### Tabela `rv_deflator_applications`

Registros manuais de deflatores aplicados a um operador específico num mês.

```sql
create table rv_deflator_applications (
  id uuid primary key default gen_random_uuid(),
  operator_email text not null,
  mes_ref date not null,
  deflator_type_id uuid not null references rv_deflator_types(id) on delete cascade,
  occurrence_count int not null default 1,    -- quantas vezes ocorreu no mês
  notes text,                                  -- opcional, não pedido pelo usuário, mas útil
  applied_by uuid not null references profiles(id),
  applied_at timestamptz default now()
);

create index rv_deflator_apps_operator_idx on rv_deflator_applications(operator_email);
create index rv_deflator_apps_mes_idx on rv_deflator_applications(mes_ref);
```

**RLS comum a todas as tabelas:**
- Read: qualquer autenticado
- Insert/Update/Delete: apenas ADM (manage_system)

## Página `/config/rv`

### Tab "Regras"

Renderiza todas as regras do **scope "current"** (regras do mês atual). 
ADM edita inline. Seções:

**Bloco 1 — Configurações gerais**

```
Teto base:           [ R$ 1.200 ]
Multiplicador máx:   [ 100% ]
```

**Bloco 2 — Elegibilidade**

Lista de regras de elegibilidade. Cada uma:

```
☐ Tempo logado
   KPI: [ tempo_logado_pct ▼ ]   Operador: [ ≥ ▼ ]   Valor: [ 95 ]%
   [Remover]

☐ Suspensão = 0
   KPI: [ suspensao ▼ ]          Operador: [ = ▼ ]   Valor: [ 0 ]
   [Remover]

[+ Adicionar regra de elegibilidade]
```

**Bloco 3 — Indicadores com faixas**

Cada indicador tem nome + faixas editáveis:

```
Tx Retenção
  KPI: [ tx_retencao_bruta ▼ ]   Direção: [ maior é melhor ▼ ]
  
  Faixa 1: a partir de [ 66 ]% → [ R$ 700 ]
  Faixa 2: a partir de [ 63 ]% → [ R$ 400 ]
  Faixa 3: a partir de [ 60 ]% → [ R$ 300 ]
  Faixa 4: a partir de [ 57 ]% → [ R$ 200 ]
  [+ Adicionar faixa]
  
  Pré-requisito: nenhum

[Salvar]
```

E pra Variação Ticket:

```
Variação Ticket
  KPI: [ variacao_ticket ▼ ]   Direção: [ mais próximo de 0 ▼ ]
  
  Faixa 1: a partir de [ -6 ]% → [ R$ 200 ]
  Faixa 2: a partir de [ -9 ]% → [ R$ 150 ]
  ...
  
  Pré-requisito: [ Tx Retenção ≥ 60 ]%

[Salvar]
```

**Bloco 4 — Indicadores binários**

```
Pausas ≤ 14.5%
  KPI: [ indisp_total ▼ ]   Operador: [ ≤ ]   Valor: [ 14.5 ]%
  Valor se atingido: [ R$ 150 ]
  [Salvar]

TMA ≤ 12:11
  KPI: [ tma ▼ ]            Operador: [ ≤ ]   Valor: [ 12:11 ]
  Valor se atingido: [ R$ 150 ]
  [Salvar]
```

**Bloco 5 — Bônus de Desempenho**

```
Bônus de Desempenho
  Condições (TODAS precisam ser atingidas):
    • [ tx_retencao_bruta ▼ ] [ ≥ ] [ 66 ]%   [Remover]
    • [ churn ▼ ]              [ ≤ ] [ 0 ]    [Remover]
    • [ indisp_total ▼ ]       [ ≤ ] [ 14.5 ]%   [Remover]
    [+ Adicionar condição]
  
  Valor se todas atingidas: [ R$ 300 ]
  [Salvar]
```

**Bloco 6 — Multiplicador**

```
Multiplicador (Pedidos)
  KPI: [ pedidos ▼ ]
  Comparado com: [ forecast_pedidos ▼ ]
  ☑ Trava em 100% (não ultrapassa o bruto)
  [Salvar]
```

**Bloco 7 — Tipos de deflator**

```
Tipos de deflator (descontos aplicáveis)

Automáticos (do KPI):
  ┌─────────────────────────────────────────────────────────────┐
  │ TMA fora da meta                                              │
  │ KPI: [ tma ▼ ]   Disparo: [ > ] [ 12:11 ]                    │
  │ Desconto inicial: [ -15% ]   Acumula: [ 0 ]% por ocorrência   │
  │ [Salvar] [Remover]                                            │
  └─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────┐
  │ Pausas fora da meta                                           │
  │ KPI: [ indisp_total ▼ ]   Disparo: [ > ] [ 14.5 ]%           │
  │ Desconto inicial: [ -15% ]   Acumula: [ 0 ]% por ocorrência   │
  └─────────────────────────────────────────────────────────────┘
  [+ Adicionar deflator automático]

Manuais (aplicados via "Aplicar Deflator"):
  ┌─────────────────────────────────────────────────────────────┐
  │ Erro de procedimento                                          │
  │ Desconto inicial: [ -30% ]   Acumula: [ -10% ] por ocorrência │
  │ [Salvar] [Remover]                                            │
  └─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────┐
  │ Não escalonar oferta                                          │
  │ Desconto inicial: [ -50% ]   Acumula: [ 0 ]% por ocorrência   │
  └─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────┐
  │ Advertência                                                   │
  │ Desconto inicial: [ -50% ]   Acumula: [ 0 ]% por ocorrência   │
  └─────────────────────────────────────────────────────────────┘
  [+ Adicionar deflator manual]
```

### Tab "Aplicar Deflator"

Lista de operadores cadastrados em `profiles`, com botão pra cadastrar 
ocorrência:

```
Aplicar deflator manual — mês de Maio/2026

  [Selecionar operador ▼]
  [Selecionar tipo de deflator ▼]
  [Adicionar ocorrência]

Aplicações deste mês:

  samyrha.fenix@alloha.com
    • Erro de procedimento — 2 ocorrências (-40% total)
      [Remover ocorrência] [Remover todas]
  
  marcos.psilva@alloha.com
    • Advertência — 1 ocorrência (-50%)
      [Remover]
```

ADM vê tudo do mês corrente. Para apagar uma ocorrência, clica em 
"Remover ocorrência" (decrementa de 2 pra 1) ou "Remover todas" 
(apaga a aplicação inteira).

## Página `/rv/atual` (operador vê)

### Header

```
RV / estimativa · atual
🗓  Maio 2026  •  cálculo baseado em dados até 13/05
```

### Card de status geral (topo)

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│           RV ESTIMADA                                        │
│                                                              │
│              R$ 1.080,00                                     │
│                                                              │
│   Teto possível: R$ 1.500 (incluindo Bônus de Desempenho)    │
│   ⚠ Estimativa. O valor oficial é o calculado pela empresa.  │
└────────────────────────────────────────────────────────────┘
```

**Quando bônus está impossível:**

```
┌────────────────────────────────────────────────────────────┐
│           RV ESTIMADA                                        │
│              R$ 810,00                                       │
│                                                              │
│   Teto possível: R$ 1.200 (Bônus indisponível: Churn estourado) │
│   Você travou R$ 300 que não podem mais ser recuperados.    │
│   ⚠ Estimativa. O valor oficial é o calculado pela empresa.  │
└────────────────────────────────────────────────────────────┘
```

### Estado "RV indisponível" (status ≠ ativo)

Quando o operador estava de férias / licença / desligado, a página 
substitui TODOS os blocos por um único card:

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│                          🏖                                  │
│                                                              │
│        Operador em férias neste mês — RV não aplicável       │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

Sem header de "ganhou", "perdeu", "potencial". Apenas a mensagem.

Ícone varia conforme status:
- férias: 🏖
- licença: 🏥
- desligado: ⊘
- outro: ⚠

### Bloco "O que você ganhou"

Lista de indicadores atingidos (em verde):

```
✓ O QUE VOCÊ GANHOU                          R$ 1.350,00

  Tx Retenção (65.2% — faixa 60%)              R$ 300
  Pausas ≤ 14.5% (12.3%)                       R$ 150
  TMA ≤ 12:11 (11:45)                          R$ 150
  Variação Ticket (-7%, faixa -9%)             R$ 150
  Bônus de Desempenho                          —impossível
  
  Bruto: R$ 750
  × 90% (Pedidos: 36/40)                       R$ 675
```

### Bloco "O que você perdeu por deflatores"

```
✗ DEFLATORES APLICADOS                        -R$ 101,25

  TMA fora da meta — não se aplica
  Pausas fora da meta — não se aplica
  Erro de procedimento (1 ocorrência)           -15%   -R$ 101,25
  
  Total descontado: -15%
```

### Bloco "O que você ainda pode ganhar"

```
↑ O QUE VOCÊ AINDA PODE GANHAR

  Subir Tx Retenção para 63% (atual 60.2%)     +R$ 100
  Subir Tx Retenção para 66% (atual 60.2%)     +R$ 400
  Subir Variação Ticket para -6% (atual -7%)   +R$ 50
  Bater todos Pedidos (atual 90%)              +10% no subtotal
```

### Bloco "O que você não pode mais ganhar"

```
⊘ INDISPONÍVEL ESTE MÊS

  Bônus de Desempenho (R$ 300)
    Motivo: Churn = 5% (precisava ser ≤ 0%)
```

### Estado vazio

Se o operador não tem snapshot do mês atual: "Sem dados de KPI para 
este mês. Sem dados não é possível calcular o RV estimado."

## Página `/rv/passado` (operador vê)

Estrutura idêntica à `/rv/atual`, com 2 diferenças:

1. Usa o conjunto de regras **"previous"** em vez de "current"
2. Header diz "RV / estimativa · passado · Abril 2026"

Quando não há mês passado no banco: "Ainda não há mês passado para 
consultar."

## Card no /kpi/atual-principal

Adicionar um card discreto no painel principal:

```
┌────────────────────────────────────────┐
│ RV ESTIMADA            R$ 1.080,00      │
│ teto possível: R$ 1.500                 │
│ [ ver detalhes →                       ] │
└────────────────────────────────────────┘
```

Clique leva pra `/rv/atual`.

## Algoritmo de cálculo

Função `calculateRv(operatorEmail, mesRef, ruleScope)`:

```
0. VERIFICAR STATUS DO OPERADOR:
   - Lê meta_status do snapshot
   - Normaliza (lowercase, trim, remove acentos)
   - Se status diferente de "ativo" (e diferente de null/vazio):
     → retorna { 
         valor: 0, 
         indisponivel: true, 
         motivo_indisponibilidade: "[status]" 
       }
   - Caso contrário, continua para etapa 1

1. Lê snapshot do operador (kpi_monthly_snapshots) pelo mes_ref
2. Lê conjunto de regras pelo scope ('current' ou 'previous')
3. Lê aplicações de deflator do operador no mês

4. ETAPA ELEGIBILIDADE:
   - Para cada rule em rv_eligibility_rules:
     - Lê valor do kpi_slug no snapshot
     - Aplica comparison contra threshold
     - Se falhar, retorna { valor: 0, motivo: "não elegível: [rule.name]" }

5. ETAPA BRUTO:
   - Para cada rv_tiered_indicator:
     - Verifica pré-requisito (se houver)
     - Lê valor do kpi_slug no snapshot
     - Procura faixa atingida (na ordem definida) → soma valor da faixa
   - Para cada rv_binary_indicator:
     - Lê valor do kpi_slug no snapshot
     - Aplica comparison → se atinge, soma value_if_achieved
   - Para rv_combined_bonus:
     - Para cada condition no array conditions:
       - Lê valor do kpi_slug e aplica comparison
     - Se TODAS atingidas, soma value_if_all_achieved
   - bruto = soma de tudo

6. ETAPA MULTIPLICADOR:
   - Lê rv_multiplier
   - pct_atingido = valor_pedidos / valor_forecast_pedidos
   - Se cap_at_100_pct e pct > 1, pct = 1
   - subtotal = bruto × pct

7. ETAPA DEFLATORES:
   - Para cada rv_deflator_type:
     - Se auto_from_kpi_slug está preenchido:
       - Lê valor do KPI, aplica auto_comparison contra auto_threshold
       - Se dispara, conta como 1 ocorrência
     - Se manual:
       - Conta ocorrências em rv_deflator_applications
   - Para cada deflator ativo:
     - desconto = initial_percent + (occurrences - 1) × increment_per_occurrence
     - Soma todos os descontos
   - liquido = subtotal × (1 - soma_descontos / 100)

8. CALCULA TETO POSSÍVEL:
   - teto_base + soma de bônus combinados que AINDA SÃO POSSÍVEIS
   - Um bônus combinado é "impossível" quando alguma de suas condições 
     já estourou (valor atual já viola, não há como reverter)

9. CALCULA "POTENCIAIS DE GANHO":
   - Para cada tiered indicator não atingido na faixa máxima:
     - Mostra quanto faltam pra próxima faixa
   - Para cada binary indicator não atingido:
     - Mostra valor que seria ganho
   - Para cada combined bonus possível mas não atingido:
     - Mostra o valor + condições faltantes

10. RETORNA estrutura completa para a UI
```

## Snapshot virada de mês

Quando vira um mês novo:

1. ADM acessa `/config/rv` e vê aviso: "Vire o mês de regras agora"
2. Botão "Promover regras atuais para passadas"
3. Ao clicar:
   - Sistema copia tudo de `rule_set scope='current'` pra `scope='previous'`
   - Mantém `scope='current'` editável pro novo mês
   - Confirma com modal "Tem certeza? As regras passadas atuais serão sobrescritas"

Esse processo **não é automático** porque depende do ADM decidir o 
momento certo (geralmente no fechamento do mês).

Alternativa futura: automatizar via cron quando muda o mês. Por agora, 
manual.

## Estados

### Loading
Skeletons em todos os blocos.

### Erro
Cards "Erro ao calcular RV. Tentar novamente."

### Vazio (operador sem snapshot)
"Sem dados de KPI para este mês. Sem dados, não é possível calcular RV."

### Sucesso
Renderização completa.

## Componentes a criar

Em `src/components/rv/`:
- `rv-status-card.tsx` — Card do topo (valor + teto)
- `rv-gained-block.tsx` — Bloco "O que você ganhou"
- `rv-deflators-block.tsx` — Bloco "Deflatores aplicados"
- `rv-potential-block.tsx` — Bloco "O que você ainda pode ganhar"
- `rv-impossible-block.tsx` — Bloco "Indisponível este mês"
- `rv-summary-card.tsx` — Card mini pro painel KPI

Em `src/components/config-rv/`:
- `config-rv-tabs.tsx` — Tabs (Regras / Aplicar Deflator)
- `rule-eligibility-list.tsx`
- `rule-tiered-indicator.tsx`
- `rule-binary-indicator.tsx`
- `rule-combined-bonus.tsx`
- `rule-multiplier.tsx`
- `rule-deflator-types.tsx`
- `apply-deflator-form.tsx`
- `apply-deflator-list.tsx`

## Funções de leitura/cálculo

Em `src/lib/rv/`:
- `types.ts` — Tipos completos
- `get-rules.ts` — Lê todas as regras de um scope
- `get-deflator-applications.ts` — Lê aplicações de um operador num mês
- `calculate-rv.ts` — Função pura de cálculo (recebe snapshot + regras + apps, retorna resultado)
- `actions/update-rule-set.ts` — Server action pra atualizar configurações gerais
- `actions/upsert-eligibility-rule.ts` — Server action
- `actions/upsert-tiered-indicator.ts` — Server action
- `actions/upsert-binary-indicator.ts` — Server action
- `actions/upsert-combined-bonus.ts` — Server action
- `actions/upsert-multiplier.ts` — Server action
- `actions/upsert-deflator-type.ts` — Server action
- `actions/apply-deflator.ts` — Server action (criar aplicação)
- `actions/remove-deflator-application.ts` — Server action
- `actions/promote-current-to-previous.ts` — Server action (vira o mês)

## Decisões técnicas

### Por que 2 rule_sets fixos em vez de versionamento por mês?

Você não quer histórico longo de regras. Manter só "current" e "previous" 
é a forma mais enxuta. Quando vira o mês, "current" copia pra "previous". 
Simples.

### Por que JSON em rv_tiered_indicators.faixas e rv_combined_bonus.conditions?

Arrays de comprimento variável. Em vez de tabela filha, JSON inline é 
mais simples pra ler/escrever. Performance é irrelevante nessa escala.

### Por que cálculo no servidor a cada acesso?

Cálculo é leve (poucas linhas de KPI + regras). Não justifica cache. 
Faz on-demand, sempre fresco.

### Por que deflatores manuais não têm "ocorrência por dia"?

Você decidiu: deflator é por mês. Cada ocorrência conta separado, mas 
não tem campo de data. Se precisar futuramente, adicionamos.

### Por que o cálculo de "teto possível" desconta bônus impossíveis?

Pra dar honestidade visual ao operador. Se ele já estourou o Churn no 
dia 5, mostrar "teto R$ 1.500" pelo resto do mês é mentira. O sistema 
deduz e mostra "R$ 1.200, você travou R$ 300".

## Observações

- Esta é a **maior feature do projeto até agora**. Implementação será 
  em fases sucessivas (banco → cálculo → config UI → operador UI)
- O cálculo é o **coração técnico** — deve ser testado isoladamente 
  com cenários variados antes de integrar
- A configuração é flexível o suficiente pra mudar **qualquer regra** 
  sem código novo (faixas, indicadores, bônus, deflatores)
- Para mudar a estrutura (ex: adicionar um 2º multiplicador), aí precisa 
  código — mas isso é raro
- RV de Gestor fica pra muito depois — escopo separado
- A "promoção" de current → previous é manual no botão, não automática 
  pelo calendário. Decisão consciente: ADM controla o timing.

## Versão

1.1 — adiciona tratamento de status do operador (férias/licença/desligado) como etapa 0 do cálculo, com bloco visual dedicado de "RV indisponível".