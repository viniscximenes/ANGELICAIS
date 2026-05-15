# KPI — Mês Passado · Principal

## Objetivo

Apresentar ao operador os 7 KPIs principais do **mês passado fechado**, 
em cards visuais com a mesma estrutura visual da página `/kpi/atual-principal`, 
mas **sem coloração** (todos os valores em cinza neutro) e **sem exibir metas**.

A página é um "espelho" do mês anterior — ferramenta de consulta histórica. 
Como o mês está fechado, não faz sentido mostrar progresso ou comparação 
com meta: o número é o que é. A ausência de cor reforça o caráter 
puramente informativo.

## Rota

`/kpi/passado-principal`

## Quem acessa

- **OP / AUX / ADM** veem apenas os próprios cards
- **GESTOR** é redirecionado para `/gestor/d-1`

## Lógica de negócio

### Definição de "mês passado"

O sistema considera "mês passado" o **mês imediatamente anterior** ao 
mês atual baseado na data do servidor (timezone Brasília).

Exemplo:
- Hoje é 14/05/2026 → mês passado = Abril/2026 (`2026-04-01`)
- Hoje é 02/06/2026 → mês passado = Maio/2026 (`2026-05-01`)

### Origem dos dados

Mesma origem da `/kpi/atual-principal`, mas filtrando por `mes_ref` igual 
ao mês passado:

- `kpi_monthly_snapshots` — valores do mês anterior, filtrados pelo 
  email do usuário logado
- `kpi_definitions` — apenas pra ler `display_name`, `value_type` e ordem. 
  **Não usa metas nem coloração.**

### Mês passado sem dados

Quando o usuário logado **não tem** snapshot do mês passado (foi 
cadastrado depois, estava ausente, ou o sistema ainda não tem dados 
desse mês), a página exibe um estado vazio:

```
📊 Sem dados do mês passado

Não há registro de KPI para [Mês/Ano] no seu histórico.
```

### Quando não existe mês passado no banco

Se a tabela `kpi_monthly_snapshots` **não tem nenhum registro** do 
mês passado (sistema novo, só tem mês atual), a página exibe:

```
📊 Ainda não há mês passado para consultar

Volte aqui após o fechamento do mês atual.
```

### Hora do snapshot

Header mostra:
- Mês de referência em destaque ("Abril / 2026")
- "Dados até DD/MM" (data_corte do snapshot do operador — geralmente 
  o último dia do mês)

Sem timestamp de "atualizado em" (já que mês está fechado, essa 
informação não agrega).

## Fonte de dados

Combina 2 tabelas Supabase:

- `kpi_monthly_snapshots` — valores (filtrados pelo email do usuário 
  + mês passado)
- `kpi_definitions` — apenas pra `display_name`, `value_type` e 
  `display_order` (filtrar `group_type = 'principal'`)

`profiles` fornece o email corporativo do usuário logado via 
`getCurrentUser()`.

### Os 7 KPIs (mesma lista do mês atual)

| # | Nome interno | Tipo |
|---|---|---|
| 1 | Tx. Retenção Bruta (%) | percent |
| 2 | Pedidos | number |
| 3 | Churn | number |
| 4 | % Variação Ticket | percent_negative |
| 5 | TMA | time |
| 6 | ABS (%) | percent |
| 7 | Indisp Total (%) | percent |

### Ordem visual (mesma do mês atual)

1. **Tx. Retenção Bruta** — card hero (grande)
2. **Indisp Total**
3. **TMA**
4. **ABS**
5. **Pedidos**
6. **Churn**
7. **% Variação Ticket**

A ordem é mantida pra consistência visual com a página do mês atual — 
o operador encontra os KPIs no mesmo lugar.

## Estrutura visual

### Header

```
KPI / passado · principal
🗓  Abril 2026  •  dados até 30/04
```

Mesma estética do header do mês atual, adaptada.

### Bloco 1 — Card hero de TX Retenção Bruta

Reaproveita o componente do mês atual, mas **sem barra colorida superior 
e sem texto de meta**:

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│            TX RETENÇÃO BRUTA                                 │
│                                                              │
│                62.3 %                                        │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Visual:**
- Sem barra superior com gradiente
- Número em cor **branca padrão** (`var(--foreground)`)
- Símbolo `%` no mesmo tom apagado de sempre
- Sem linha de "meta: ..."

### Bloco 2 — Grid de 6 cards médios

Reaproveita o componente do mês atual, mas todos em **cor cinza neutra**:

```
┌─────────────────────────┐
│                         │ ← sem barra lateral colorida
│  INDISP TOTAL           │
│                         │
│      12.3 %             │
│                         │
└─────────────────────────┘
```

**Visual:**
- Sem barra lateral colorida (ou em cor `var(--muted-foreground)` 
  para manter o "frame")
- Valor em cor branca padrão
- Sem linha de "meta: ..."
- Mantém ordem visual dos 6 cards (Indisp, TMA, ABS, Pedidos, Churn, 
  Δ Ticket)

**Pedidos e Churn:** mesmo sem coloração, exibir o **valor** apenas 
(sem comparativo com forecast). A linha "meta:" não aparece.

### Bloco 3 — Estado vazio

Se não há snapshot do operador OU se não há mês passado no banco:

```
┌────────────────────────────────────────┐
│                                         │
│                📊                       │
│                                         │
│   Sem dados do mês passado             │
│                                         │
│   Não há registro de KPI para           │
│   [Abril / 2026] no seu histórico.      │
│                                         │
└────────────────────────────────────────┘
```

Reaproveita o componente `KpiEmptyState` do mês atual, com texto 
adaptado.

## Componentes a criar/reusar

**Reusar (sem mudanças visuais):**
- `KpiEmptyState` com prop opcional para mensagem customizada

**Reusar com prop nova:**
- `TxRetencaoHeroCard` — adicionar prop `neutral?: boolean`. Quando 
  `true`, esconde barra superior e linha de meta, força cor branca no 
  número.
- `KpiMediumCard` — adicionar prop `neutral?: boolean`. Quando `true`, 
  esconde barra lateral colorida e linha de meta, força cor branca no 
  valor.

**Alternativa (recomendada):**
Criar componentes específicos da página passada que reaproveitam a 
estrutura mas com visual neutro fixo:
- `TxRetencaoHeroCardNeutral`
- `KpiMediumCardNeutral`

A vantagem é não poluir os componentes do mês atual com props condicionais.

**Decisão:** prop `neutral?: boolean` nos componentes existentes. 
Mais simples, menos código duplicado.

## Funções de leitura

Criar em `src/lib/kpi/passado/`:

- `get-previous-month-snapshot.ts` — busca o snapshot do mês passado 
  filtrado pelo email do operador
- Reaproveitar `format-kpi-value.ts` do mês atual

Não precisa de `enrich-with-definitions` (não há cálculo de status — 
todos os valores são neutros).

### Lógica de `get-previous-month-snapshot.ts`

```typescript
// Calcula mês passado em timezone Brasília
function getPreviousMonthRef(): string {
  // Pega ano/mês atual em BR, subtrai 1
  // Se mês = 1, vai pro ano anterior, mês = 12
}

// Query simples
.from("kpi_monthly_snapshots")
.eq("operator_email", normalizedEmail)
.eq("mes_ref", previousMonthRef)
```

Retorna um tipo similar ao `CurrentMonthSnapshot` mas **sem o campo 
`status`** nos valores (já que tudo é neutro). Pode ser:

```typescript
type PreviousMonthSnapshot = {
  hasData: boolean;
  mesRef: string;
  dataCorte: string | null;
  kpis: Map<string, { definition: KpiDefinition; valor: number | null }>;
};
```

## Sidebar

Adicionar **abaixo de "Mês Atual"** uma nova entrada **"Mês Passado"** 
apontando pra `/kpi/passado-principal`.

Estrutura final da sub-seção KPI na sidebar:
- Mês Atual → `/kpi/atual-principal`
- Mês Passado → `/kpi/passado-principal`

Quando a página `/kpi/passado-secundario` for criada futuramente, ela 
será navegada via tabs dentro da própria `/kpi/passado-principal` 
(igual a estrutura do mês atual). Sem alteração na sidebar.

## Estados

### Loading

Skeleton: 1 card grande + 6 médios em grid (estrutura idêntica ao 
mês atual, sem barras coloridas).

### Erro

- **Falha de leitura do Supabase:** card central com "Erro ao carregar 
  dados. Tentar novamente."

### Vazio

- **Operador sem snapshot do mês passado:** Bloco 3 substitui blocos 1 e 2

### Sucesso

Renderização padrão (header + blocos 1 + 2).

## Animações de entrada

- Header com PageTransition
- Card hero: scale + fade (delay 0.2s)
- 6 cards médios: stagger (delay incremental 0.08s entre cada, começando em 0.35s)

Easing `[0.16, 1, 0.3, 1]` em tudo.

No estado vazio, apenas um fade-in suave do card de mensagem.

## Auto-refresh

Sem auto-refresh. Mês passado é estático por natureza — não há motivo 
para revalidar dados que não mudam.

## Acessibilidade

- Cards com `aria-label` descritivo (ex: "TX Retenção Bruta: 62.3%")
- Hierarquia de heading correta (`h1` no título, `h2` nos blocos)
- Estado vazio com `role="status"` para leitores de tela

## Responsividade

- **Desktop (≥ 1024px):** layout completo
- **Tablet (640-1023px):** card hero ocupa largura total, 6 médios em 
  2 colunas
- **Mobile (< 640px):** todos em coluna única

## Observações

- A página é, em essência, **a página do mês atual sem cores**
- A ausência de cor é **intencional**: comunica "fechado, informativo"
- Reaproveita ao máximo os componentes do `kpi/atual-principal`
- A prop `neutral` nos componentes existentes é a forma mais simples de 
  implementar
- Não há tabs dentro desta página nesta v1 — futura página 
  `/kpi/passado-secundario` virá com `.md` próprio e tabs serão 
  adicionadas depois

## Versão

1.0 — criada antes da implementação. Atualizar após criar componentes 
e função de leitura.