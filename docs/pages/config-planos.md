# CONFIG — Planos e Descontos

## Objetivo

Painel onde o ADM gerencia:
1. **Marcas** atendidas pela operação (ex: Alloha, futuras parceiras)
2. **Planos** disponíveis em cada marca (com nome, valor, tem OTT)
3. **Regras de desconto** vigentes (faixas permitidas por tempo de cliente e OTT)

Esses dados alimentam a página `/atendimento`, onde o operador consulta 
ofertas permitidas durante a ligação ao vivo.

A política de desconto **muda com frequência** (mensal/trimestral), então 
toda a configuração precisa ser editável sem deploy de código.

## Rota

`/config/planos`

## Quem acessa

- **ADM** — único role com acesso
- **OP / AUX / GESTOR** — redirecionados

## Princípios

- **Dados versionáveis no banco** — não em arquivo de código
- **Edição inline** quando possível (sem precisar abrir modal pra mudar 1 valor)
- **Validações fortes** — descontos negativos, sobreposição de faixas, plano sem valor
- **Histórico não obrigatório** — versão atual sobrescreve. Se precisar de histórico no futuro, é evolução

## Modelo de dados

### Tabela `marcas`

```sql
create table marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Exemplos: "Alloha", futuras parceiras.

### Tabela `planos`

```sql
create table planos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references marcas(id) on delete cascade,
  nome text not null,                          -- ex: "100M", "500M + Globoplay"
  valor numeric(10, 2) not null,               -- ex: 69.99
  tem_ott boolean not null default false,
  is_active boolean not null default true,
  ordem int not null default 0,                -- pra ordenação manual no dropdown
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index planos_marca_idx on planos(marca_id);
create index planos_active_idx on planos(is_active);
```

### Tabela `regras_desconto`

```sql
create table regras_desconto (
  id uuid primary key default gen_random_uuid(),
  
  -- Critérios da regra
  tem_ott boolean not null,                    -- se a regra se aplica a planos com ou sem OTT
  tempo_min_meses int not null,                -- inclusive (ex: 6 → cliente >= 6 meses)
  tempo_max_meses int,                         -- inclusive, null = sem limite superior
  
  -- O que a regra permite
  desconto_max_pct int not null,               -- ex: 30 (até 30%)
  duracao_meses int not null,                  -- ex: 6 (por 6 meses)
  
  -- Auditoria
  ordem int not null default 0,                -- pra ordenação visual
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create index regras_desconto_active_idx on regras_desconto(is_active);
create index regras_desconto_ott_idx on regras_desconto(tem_ott);
```

**Por que tempo_max_meses nullable?**
Pra suportar "≥ 7 meses sem limite". Se for null, regra vale pra qualquer 
tempo acima do mínimo.

**Por que múltiplas regras se aplicam ao mesmo critério?**
Cliente com 6 meses sem OTT pode receber 30% por 6m OU 15% por 12m → 
são DUAS regras separadas, ambas com `tem_ott=false`, `tempo_min=6`, 
mas com `desconto_max` e `duracao` diferentes.

### RLS

```sql
alter table marcas enable row level security;
alter table planos enable row level security;
alter table regras_desconto enable row level security;

-- Leitura: todos autenticados (atendimento precisa ler)
create policy "Auth can read marcas" on marcas for select to authenticated using (true);
create policy "Auth can read planos" on planos for select to authenticated using (true);
create policy "Auth can read regras" on regras_desconto for select to authenticated using (true);

-- Escrita: apenas ADM
create policy "ADM manages marcas" on marcas for all to authenticated 
  using ((select is_adm())) with check ((select is_adm()));

create policy "ADM manages planos" on planos for all to authenticated 
  using ((select is_adm())) with check ((select is_adm()));

create policy "ADM manages regras" on regras_desconto for all to authenticated 
  using ((select is_adm())) with check ((select is_adm()));
```

## Estrutura visual

A página tem 3 seções verticais, na ordem:

```
┌──────────────────────────────────────────────────┐
│  Configurações / Planos e Descontos                │
│                                                    │
│  SEÇÃO 1 — MARCAS                                  │
│  [tabela compacta com inline edit]                 │
│                                                    │
│  ────────────────────────────────                  │
│                                                    │
│  SEÇÃO 2 — PLANOS                                  │
│  [agrupados por marca, expansível]                 │
│                                                    │
│  ────────────────────────────────                  │
│                                                    │
│  SEÇÃO 3 — REGRAS DE DESCONTO                      │
│  [tabela com tabs Sem OTT / Com OTT]               │
└──────────────────────────────────────────────────┘
```

### SEÇÃO 1 — Marcas

Header: "Marcas" + botão "+ Nova marca" à direita.

Tabela compacta:

```
┌──────────────────────────────────────────┐
│  Nome      │  Status    │  Planos │  Ações│
├──────────────────────────────────────────┤
│  Alloha    │  Ativa     │  6      │  [···]│
│  Parceira  │  Inativa   │  2      │  [···]│
└──────────────────────────────────────────┘
```

**Inline edit:** clica no nome → vira input. Enter salva, Esc cancela.

**Coluna Status:** toggle ativa/inativa (clique direto).

**Coluna Planos:** contagem de planos ativos da marca (link clica e 
expande a seção de planos filtrada).

**Coluna Ações:** menu com "Renomear", "Apagar" (só se não tiver planos).

**Modal "Nova marca":** input "Nome" + botão "Criar".

### SEÇÃO 2 — Planos

Header: "Planos" + filtro por marca à direita (dropdown).

Visualização por **marca expansível**:

```
▾ Alloha (6 planos)                       [+ Novo plano]
┌──────────────────────────────────────────────────┐
│  Nome              │  Valor   │  OTT   │  Ações  │
├──────────────────────────────────────────────────┤
│  100M              │  R$69,99 │  ☐     │  [···]  │
│  200M              │  R$79,99 │  ☐     │  [···]  │
│  400M              │  R$79,99 │  ☐     │  [···]  │
│  500M              │  R$89,99 │  ☑     │  [···]  │
│  500M + Globoplay  │  R$99,99 │  ☑     │  [···]  │
│  1G                │  R$149,99│  ☑     │  [···]  │
└──────────────────────────────────────────────────┘
```

**Inline edit:** nome, valor, OTT — todos editáveis direto na tabela.

**Drag handle à esquerda:** reordenar planos arrastando (atualiza `ordem`).

**Coluna Ações:** menu com "Desativar" (oculta do dropdown de atendimento) 
e "Apagar".

**Modal "Novo plano":**
- Marca (dropdown — pré-selecionada se aberto numa marca específica)
- Nome (input texto)
- Valor (input numérico com formatação BR — vírgula)
- Tem OTT (checkbox)
- Botão "Criar"

### SEÇÃO 3 — Regras de Desconto

Header: "Regras de desconto" + tabs "Sem OTT" / "Com OTT".

Tabela ordenada por `tempo_min_meses` crescente:

```
TAB: Sem OTT

┌────────────────────────────────────────────────────┐
│  Tempo de cliente │  Desconto máx │  Duração │  Ações│
├────────────────────────────────────────────────────┤
│  < 3 meses        │  10%          │  3 meses │  [···]│
│  3 a 5 meses      │  20%          │  3 meses │  [···]│
│  ≥ 6 meses        │  30%          │  6 meses │  [···]│
│  ≥ 6 meses        │  15%          │  12 meses│  [···]│
│  ≥ 7 meses        │  40%          │  6 meses │  [···]│
│  ≥ 7 meses        │  20%          │  12 meses│  [···]│
└────────────────────────────────────────────────────┘
                                      [+ Nova regra]
```

**Inline edit:** desconto_max e duração editáveis direto na linha.

**Coluna "Tempo de cliente":** formato visual amigável calculado de 
`tempo_min` e `tempo_max`:
- `tempo_min=0, tempo_max=2` → "< 3 meses"
- `tempo_min=3, tempo_max=5` → "3 a 5 meses"
- `tempo_min=6, tempo_max=null` → "≥ 6 meses"

Clique no campo "Tempo de cliente" abre modal pra editar tempo_min / 
tempo_max (não é trivial inline).

**Coluna Ações:** menu com "Duplicar", "Apagar".

**Modal "Nova regra":**
- Tem OTT (radio Sim/Não, pré-selecionado pela tab atual)
- Tempo mínimo (meses) — input numérico
- Tempo máximo (meses) — input numérico, com checkbox "Sem limite superior"
- Desconto máximo (%) — input numérico 1-100
- Duração (meses) — input numérico
- Botão "Criar regra"

### Validações de regras

- `tempo_min >= 0`
- Se `tempo_max` definido: `tempo_max >= tempo_min`
- `desconto_max` entre 1 e 100
- `duracao_meses` > 0
- **Aviso (não bloqueia):** se duas regras com mesmo `tem_ott` e mesma 
  `duracao` têm faixas de tempo que se sobrepõem, mostrar warning 
  "Regras sobrepostas detectadas" — ADM decide se quer manter ou ajustar

### Sem entrada (estados vazios)

- **Sem marcas:** "Cadastre a primeira marca para começar."
- **Marca sem planos:** "Esta marca ainda não tem planos. Adicione o primeiro."
- **Sem regras de desconto:** "Nenhuma regra de desconto cadastrada. A página 
  de atendimento não mostrará ofertas até que você cadastre as regras."

## Server actions

`src/lib/config/planos/actions/`:

**Marcas:**
- `create-marca-action.ts`
- `update-marca-action.ts` (nome, is_active)
- `delete-marca-action.ts` (bloqueia se tiver planos vinculados)

**Planos:**
- `create-plano-action.ts`
- `update-plano-action.ts` (nome, valor, tem_ott, ordem)
- `toggle-plano-active-action.ts`
- `delete-plano-action.ts`

**Regras de desconto:**
- `create-regra-action.ts`
- `update-regra-action.ts`
- `duplicate-regra-action.ts`
- `delete-regra-action.ts`

Todas com `revalidatePath("/config/planos")` e `revalidatePath("/atendimento")` 
no sucesso.

## Funções de leitura

`src/lib/config/planos/`:

- `get-all-marcas.ts` — Lista marcas (ativas + inativas)
- `get-planos-by-marca.ts` — Planos de uma marca, ordenados por `ordem`
- `get-all-planos-with-marca.ts` — Todos os planos com nome da marca (pra view geral)
- `get-all-regras.ts` — Todas as regras agrupadas por `tem_ott`

## Componentes

`src/components/config/planos/`:

- `config-planos-page.tsx` — Container das 3 seções
- `marcas-section.tsx` — Bloco 1
- `marcas-table.tsx`
- `new-marca-modal.tsx`
- `planos-section.tsx` — Bloco 2
- `planos-marca-group.tsx` — Cada grupo expansível
- `planos-table.tsx`
- `new-plano-modal.tsx`
- `regras-section.tsx` — Bloco 3
- `regras-tabs.tsx` — Tab Sem OTT / Com OTT
- `regras-table.tsx`
- `new-regra-modal.tsx`
- `edit-tempo-modal.tsx` — Modal pra editar tempo_min/tempo_max
- `inline-editable-cell.tsx` — Componente reutilizável de célula editável

## Helpers

`src/lib/config/planos/`:

- `format-tempo-cliente.ts` — Converte (tempo_min, tempo_max) → string amigável
- `validate-regra.ts` — Validações de regra antes de salvar
- `detect-overlap.ts` — Detecta regras sobrepostas e retorna warnings

## Sidebar

Adicionar 4º item na seção Configurações:

```
📂 Configurações
   KPI
   RV
   Usuários
   Planos e Descontos  ← novo
```

## Estados

### Loading
- Skeleton de cada seção (tabela placeholder)

### Erro
- Falha de leitura: card central "Erro ao carregar configurações"
- Falha de submit: toast vermelho com mensagem

### Sucesso
- Inline edit: célula pisca em verde por 500ms ao salvar
- Modal: fecha e toast verde "Criado"

## Animações

- PageTransition no carregamento
- Marca expandindo: altura anima suave
- Inline edit: foco com outline azul, transição rápida

## Acessibilidade

- Inline edit: input com `aria-label` correspondente à coluna
- Tabelas com `<thead>`/`<th>` semânticos
- Modais com `role="dialog"` e foco gerenciado

## Responsividade

- **Desktop:** tabelas completas
- **Tablet:** tabelas com scroll horizontal
- **Mobile:** seções viram cards empilhados, edição via modal (sem inline)

## Fluxo típico do ADM

### Cadastrar marca + planos pela primeira vez

1. Vai em `/config/planos`
2. Clica "+ Nova marca" → digita "Alloha" → cria
3. Marca aparece com 0 planos
4. Clica em "+ Novo plano" dentro da marca
5. Preenche nome, valor, OTT
6. Repete pra cada plano
7. Vai pra seção Regras
8. Adiciona regras de desconto pela tab "Sem OTT" e "Com OTT"

### Mudança mensal de política

1. Empresa anunciou: "Esse mês, desconto máximo de 6 meses cai de 30% pra 25%"
2. ADM vai em `/config/planos`
3. Seção Regras → tab Sem OTT
4. Encontra a linha "≥ 6 meses · 30% · 6 meses"
5. Clica no "30%" → edita inline pra "25%"
6. Salva (Enter)
7. Pronto. Operadores que abrirem `/atendimento` já veem a regra nova.

### Adicionar plano novo lançado pela empresa

1. ADM vai em `/config/planos`
2. Seção Planos → expande "Alloha"
3. Clica "+ Novo plano"
4. Preenche dados
5. Salva
6. Operadores já veem no dropdown de atendimento

## Observações importantes

- **Apagar plano não apaga histórico:** se um operador já usou o plano 
  em um protocolo (futuramente persistido), não interfere. Como hoje 
  protocolos não persistem, apagar é seguro.
- **Inline edit é prioridade:** ADM vai querer mexer rápido em valor/desconto, 
  modais atrapalham fluxo.
- **Warnings de sobreposição não bloqueiam:** ADM tem autonomia.
- **Sem versionamento de regras por enquanto:** versão vigente sobrescreve. 
  Se virar problema, abrimos discussão.

## Versão

1.0 — criada antes da implementação.