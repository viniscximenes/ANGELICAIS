# BASES — KPI

## Objetivo

Permitir ao administrador (ADM) colar dados de KPI exportados da planilha do planejamento (via Ctrl+V) e armazenar esses dados como snapshot mensal acumulado. O sistema usa a configuração de `kpi_definitions` para identificar quais colunas extrair, ignora os operadores não cadastrados em `profiles`, e mantém histórico de até 2 meses fechados além do mês atual (apaga o mais antigo automaticamente ao chegar um mês novo).

Esta página é a fonte de alimentação dos dados que aparecem em `/kpi/atual-principal`, `/kpi/atual-secundario`, e futuramente em `/kpi/passado-principal` / `/kpi/passado-secundario`.

## Rota

`/bases/kpi`

## Quem acessa

- **ADM** — único role com acesso (permissão `manage_base`)
- **AUX** — também tem `manage_base`, então também acessa
- **OP / GESTOR** — redirecionados

## Lógica de negócio

### O que é um "snapshot mensal acumulado"

Ao contrário do D-1 (que é o dado do dia anterior), o KPI representa o **acumulado do mês até o momento da colagem**.

Exemplo:
- Dia 12 de Maio: ADM cola, valores representam de 1 a 11 de maio
- Dia 13 de Maio: ADM cola, valores representam de 1 a 12 de maio (sobrescreve dia 12)
- Dia 1 de Junho: ADM cola dados de Maio fechado (com data corte 31/05). A partir daí Maio vira "mês passado".

### Mês de referência selecionável

O ADM pode escolher para qual mês está colando os dados. Útil quando:

- Está atualizando o mês corrente (caso padrão)
- Quer carregar/atualizar um **mês fechado anterior** (correção retroativa)
- Está fechando o mês ao virar pro próximo

O sistema oferece um dropdown com:
- **Mês atual** (default selecionado)
- **Meses passados** que já existem no banco
- **Outro mês** (input manual com seletor `<input type="month">`) para colar dados de meses que ainda não existem no sistema (caso ADM queira retroagir um mês ainda não cadastrado)

### Quem é considerado "operador" no sistema

A planilha do planejamento contém TODOS os operadores da empresa (~147). O sistema:

1. Identifica o operador pela coluna **Colaborador** (espera o email corporativo `@alloha.com`)
2. **Salva todos** no banco, mesmo que ainda não estejam cadastrados em `profiles`
3. Os painéis `/kpi/*` mostram apenas operadores cadastrados em `profiles`
4. Quando um operador novo é adicionado em `profiles`, ele passa a aparecer no painel **com histórico retroativo** (se houver dados de meses passados)

### Período do snapshot (data de corte)

Cada snapshot tem uma **data de referência** que indica até quando os dados são válidos. Por padrão, o sistema usa a data de **ontem** (D-1), mas o ADM pode escolher outra data no momento da colagem.

Exemplo:
- ADM cola em 14 de maio → data padrão sugerida: 13 de maio
- ADM pode editar para qualquer data válida dentro do mês selecionado
- Quando o mês selecionado é o **mês corrente**: range válido é dia 1 até hoje
- Quando o mês selecionado é **passado**: range válido é dia 1 até o último dia desse mês
- A data é salva junto com o snapshot

### Sobrescrita de dados

A cada colagem para o **mesmo mês**, os dados anteriores daquele mês são sobrescritos. A chave única é `(operador, mes_ref, kpi_slug)`. Não há histórico diário — só o último valor colado vale.

### Retenção de histórico

O sistema mantém apenas **2 meses** de snapshots: o mês atual e o
mês anterior. Qualquer outro mês é apagado automaticamente ao salvar
um novo snapshot.

Lógica aplicada na server action ao salvar:

1. Lê todos os meses únicos existentes
2. Adiciona o mês novo ao conjunto (se ainda não existe)
3. Mantém só os 2 mais recentes
4. Apaga o restante

**Exceção:** o ADM pode apagar manualmente um mês pelo botão "Apagar" no histórico (Bloco 4), independentemente da regra automática.

### Override de mapeamento por colagem

Os nomes dos cabeçalhos da planilha do planejamento **mudam ao longo do tempo**. O sistema tem 2 níveis de mapeamento:

1. **Mapeamento global** (em `/config/kpi → Mapeamento`): define o nome do cabeçalho atual. Afeta todas as colagens futuras.
2. **Override local** (modal nesta página): permite ajustar nomes **apenas para a colagem em andamento**. Não persiste em `kpi_definitions` — útil para meses passados que tinham nomes diferentes.

Fluxo:
- ADM cola dados de um mês passado
- Sistema detecta KPIs não encontrados (porque o mapeamento global mudou)
- Sistema mostra modal: "Ajuste os nomes só desta vez"
- Para cada KPI faltante, ADM pode digitar o nome alternativo (ex: "Tx Ret Bruta" em vez de "Tx. Retenção Bruta (%)")
- Sistema reprocessa **só desta colagem** com os novos nomes
- Quando a colagem termina, o override é descartado (não afeta colagens futuras)

## Modelo de dados

### Tabela `kpi_monthly_snapshots`

Armazena valores numéricos E metadados de texto (gestor, status) na mesma estrutura, usando duas colunas distintas conforme o tipo do dado.

```sql
create table kpi_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  operator_email text not null,
  mes_ref date not null,
  data_corte date not null,
  kpi_slug text not null,
  valor_numerico numeric,
  valor_texto text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(operator_email, mes_ref, kpi_slug)
);

create index kpi_snapshots_mes_idx on kpi_monthly_snapshots(mes_ref);
create index kpi_snapshots_email_idx on kpi_monthly_snapshots(operator_email);
create index kpi_snapshots_slug_idx on kpi_monthly_snapshots(kpi_slug);
```

(Tabela já criada via migration anterior — sem mudança necessária.)

### Metadados especiais

Para os 4 metadados, o sistema usa slugs reservados:

| Slug | Tipo | Coluna usada |
|---|---|---|
| `meta_gestor` | texto | `valor_texto` |
| `meta_status` | texto | `valor_texto` |
| `meta_monitorias` | numérico | `valor_numerico` |
| `meta_feedbacks` | numérico | `valor_numerico` |

### Colunas auxiliares de meta (Forecast)

| Slug | Origem |
|---|---|
| `forecast_pedidos` | Coluna "Forecast Pedidos Mês" |
| `forecast_churn` | Coluna "Forecast Churn Mês" |

### Total de slugs salvos por operador por mês

- 7 principais
- 9 secundários
- 2 forecasts
- 4 metadados

Total: **22 linhas por operador por mês**.

## Estrutura visual

### Header
- Título "Bases" + subtítulo "/ KPI"
- Microcopy: "Cole os dados exportados da planilha do planejamento."

### Bloco 1 — Configuração do snapshot

```
┌──────────────────────────────────────────────────────────────────┐
│  Mês de referência:  [ Maio / 2026  ▼ ]                          │
│  Dados até o dia:    [   13/05/2026   ]                          │
└──────────────────────────────────────────────────────────────────┘
```

**Mês de referência (dropdown):**

Opções no dropdown:
- `Maio / 2026 (mês atual)` — selecionado por padrão
- `Abril / 2026 (passado)` — se existir no banco
- `─ separador ─`
- `Outro mês…` — abre um seletor `<input type="month">` para escolher qualquer mês

Quando o ADM escolhe um mês passado ou "outro mês", a UI mostra um aviso amarelo:

```
⚠ Você está colando dados de um mês fechado.
  Os valores atuais desse mês serão sobrescritos.
```

**Dados até o dia (input date):**
- Default: ontem (D-1) quando mês selecionado é o atual; último dia do mês quando é passado
- Range: dia 1 do mês selecionado até hoje (se atual) ou último dia do mês (se passado)
- Reajusta automaticamente ao trocar de mês

### Bloco 2 — Área de colagem

```
┌──────────────────────────────────────────────────────────┐
│  📋 Cole os dados aqui (Ctrl+V)                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  (textarea grande, monospace)                      │  │
│  └────────────────────────────────────────────────────┘  │
│  Inclua o cabeçalho da planilha junto com os dados.     │
│                              [ Processar dados ]         │
└──────────────────────────────────────────────────────────┘
```

A textarea aceita texto separado por TAB (formato nativo do Excel/Sheets) ou por vírgula (CSV).

### Bloco 3 — Modal de override (quando há KPIs não encontrados)

Aparece automaticamente após "Processar dados" se algum KPI esperado não estiver no cabeçalho:

```
┌────────────────────────────────────────────────────────────┐
│  ⚠  Ajustar nomes apenas para esta colagem                  │
│                                                              │
│  Os cabeçalhos abaixo não foram identificados no clipboard. │
│  Você pode editar os nomes APENAS para esta colagem,        │
│  sem afetar a configuração global.                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tx. Retenção Bruta (%)                                │  │
│  │ [ Tx Ret Bruta                                      ] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ % Variação Ticket                                     │  │
│  │ [ Δ Ticket                                          ] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│           [ Cancelar ]  [ Reprocessar com estes nomes ]     │
└────────────────────────────────────────────────────────────┘
```

**Importante:** os nomes editados aqui só valem para esta colagem. Não afetam `kpi_definitions`. Para mudar permanentemente, ADM deve ir em `/config/kpi → Mapeamento`.

Botão "Cancelar" fecha o modal e mantém o snapshot parcial (KPIs encontrados foram salvos, faltantes ficam vazios).

Botão "Reprocessar com estes nomes" refaz o parsing com o override, encontra os KPIs faltantes, e atualiza o snapshot.

### Bloco 4 — Resultado do processamento

Aparece **abaixo** da textarea após processar:

**4a — Status geral**

```
✓  Snapshot salvo
   Mês: Maio/2026  •  Data corte: 13/05/2026
   14 operadores no sistema  •  133 outros operadores salvos
```

**4b — Operadores não cadastrados (collapsable)**

```
▼  Operadores não cadastrados (133)
   joão.silva@alloha.com — não aparece nos painéis até cadastrar
   maria.santos@alloha.com — não aparece nos painéis até cadastrar
   ...
```

**4c — KPIs não encontrados (apenas se ADM cancelou o modal)**

```
⚠  KPIs sem dados nesta colagem (2)
   • Tx. Retenção Bruta (%)
   • % Variação Ticket
   
   Esses KPIs ficaram vazios neste snapshot. Para corrigir, ajuste 
   o mapeamento em Configurações → KPI → Mapeamento e reprocesse.
```

### Bloco 5 — Histórico de snapshots

Lista de meses fechados, com botão de apagar:

```
HISTÓRICO

  Maio 2026 (atual)   atualizado em 14/05/2026  •  147 ops    
  Abril 2026          atualizado em 30/04/2026  •  145 ops    [Apagar]
```

**Comportamento do botão "Apagar":**
- Confirmação modal: "Tem certeza? Esta ação não pode ser desfeita."
- Ao confirmar, apaga todas as linhas daquele `mes_ref` no banco
- Toast verde: "Mês apagado"
- Lista atualiza automaticamente

O **mês atual não tem botão de apagar** — só meses fechados podem ser removidos manualmente.

## Fluxo de colagem

1. ADM acessa `/bases/kpi`
2. Seleciona mês de referência (default: mês atual)
3. Confirma/edita "Dados até o dia"
4. Cola dados na textarea
5. Clica em "Processar dados"
6. Sistema parseia e tenta mapear KPIs
7. **Se todos os KPIs foram encontrados:** salva direto, mostra Bloco 4
8. **Se faltam KPIs:** abre modal de override (Bloco 3)
   - ADM ajusta nomes apenas para esta colagem
   - Clica em "Reprocessar"
   - Sistema refaz parsing com nomes ajustados
   - Salva snapshot completo
9. Sistema aplica retenção (apaga meses excedentes)
10. Bloco 4 (resultado) aparece
11. Textarea é limpa

## Decisões técnicas

### Por que override local em vez de salvar no banco?

Salvar variações de nome em `kpi_definitions` poluiria o sistema. O override é um **patch temporário** para uma colagem específica — útil para meses passados sem afetar o presente.

### Por que mês selecionável em vez de fixo?

A regra original (sempre mês atual) impede:
- Correção retroativa de meses passados
- Cadastro inicial de dados históricos
- Re-importação de um mês após apagar

Tornar o mês selecionável dá flexibilidade sem complicar o caso comum (atual).

### Por que botão "Apagar" no histórico?

Permite ao ADM limpar dados errados (colagem feita com mês trocado, dados duplicados, etc.) sem precisar de SQL direto no Supabase.

### Por que UPSERT e não INSERT puro?

O ADM pode (e vai) colar dados do mesmo mês várias vezes ao longo dele. UPSERT garante que cada operador-mês-KPI tenha exatamente 1 linha viva, não acumula histórico diário.

### Por que valor_numerico E valor_texto separados?

A maioria dos KPIs é numérica. Mas Gestor e Status são texto. Em vez de armazenar tudo como `text`, uso duas colunas onde **apenas uma é preenchida por linha**.

### Por que limpeza na server action e não trigger?

Visibilidade. A server action loga "apaguei mês X". Trigger faria o mesmo silenciosamente, dificultando debug.

## Estados

### Loading

- Skeleton dos selects e textarea
- Histórico com 3 linhas skeleton

### Erro

- **Textarea vazia ao processar:** toast "Cole os dados primeiro"
- **Cabeçalho não tem linha:** toast "Dados inválidos — inclua o cabeçalho"
- **Nenhum KPI encontrado:** abre modal de override automaticamente
- **Falha no Supabase:** toast vermelho com mensagem específica
- **Falha ao apagar mês:** toast vermelho "Não foi possível apagar"

### Vazio

- **Nenhum snapshot ainda no banco:** Histórico mostra "Nenhum dado de KPI salvo ainda."

### Sucesso

- Toast verde "Snapshot processado"
- Bloco 4 aparece
- Textarea é limpa
- Histórico atualiza automaticamente

## Animações de entrada

- Header e blocos 1, 2 em stagger leve (delay 0.1s entre cada)
- Bloco 3 (modal) aparece com fade + scale leve
- Bloco 4 (resultado) com `motion.div` fade-up após processamento
- Histórico (bloco 5) fade-up no carregamento inicial

## Acessibilidade

- Textarea com `<label>` explícito
- Dropdown com `aria-label`
- Botão "Processar dados" com `aria-busy` durante o save
- Modal de override com `role="dialog"` e foco gerenciado
- Botão "Apagar" com confirmação obrigatória

## Responsividade

- **Desktop (≥ 1024px):** layout completo
- **Tablet/Mobile:** textarea ocupa largura total, selects empilham

## Observações

- Página depende **fortemente** de `kpi_definitions` estar corretamente configurada
- O parser de cabeçalhos é o ponto técnico mais crítico — deve ser tolerante a variações
- Reaproveitar a função `normalizeHeader()` (já existe)
- Limpar a textarea após sucesso evita colagens duplicadas acidentais
- O override local é um patch temporário, não persiste em banco
- O botão "Apagar" só aparece para meses fechados (não para o atual)

## Versão

2.0 — atualizada com seletor de mês, override por colagem, e botão de apagar histórico.