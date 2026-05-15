# KPI — Mês Passado · Secundário

## Objetivo

Apresentar ao operador os 9 KPIs secundários do **mês passado fechado**, 
em cards visuais distribuídos uniformemente em grid 3×3. Cada usuário 
vê exclusivamente os seus próprios números, sem coloração nem metas.

A página complementa a `/kpi/passado-principal`, mostrando indicadores 
de apoio do mês anterior. Ambas as páginas se navegam via tabs no topo.

## Rota

`/kpi/passado-secundario`

## Quem acessa

- **OP / AUX / ADM** veem apenas os próprios cards
- **GESTOR** é redirecionado para `/gestor/d-1`

## Lógica de negócio

### Definição de "mês passado"

Mesma da `/kpi/passado-principal`: mês imediatamente anterior ao atual, 
em timezone Brasília.

### Origem dos dados

Reaproveita a infraestrutura da `/kpi/passado-principal`:

- `kpi_monthly_snapshots` — valores do mês anterior, filtrados pelo 
  email do usuário logado
- `kpi_definitions` — apenas `display_name`, `value_type` e ordem 
  (filtrar `group_type = 'secundario'`)

### Mês passado sem dados

Idêntico à página passado-principal:
- Banco sem nenhum mês passado → "Ainda não há mês passado para consultar"
- Operador sem snapshot → "Sem dados do mês passado para [Mês/Ano]"

### Caso especial — Tx. Retenção Líquida 15d

**Sem coloração nesta página.** O cálculo de diff sobre Tx. Retenção 
Bruta (que existe na página atual) **não se aplica aqui**: como tudo 
fica neutro, apenas o valor numérico é exibido.

### Hora do snapshot

Header mostra:
- Mês de referência ("Abril / 2026")
- "Dados até DD/MM" (data_corte do snapshot do operador)

Sem timestamp de "atualizado em".

## Fonte de dados

Combina 2 tabelas Supabase:

- `kpi_monthly_snapshots` — valores (filtrados pelo email + mês passado)
- `kpi_definitions` — só pra `display_name`, `value_type`, ordem 
  (filtrar `group_type = 'secundario'`)

### Os 9 KPIs secundários (mesma lista do mês atual)

| # | Nome interno | Tipo |
|---|---|---|
| 1 | Tx. Retenção Líquida 15d (%) | percent |
| 2 | Atendidas | number |
| 3 | Transfer (%) | percent |
| 4 | Short Call (%) | percent |
| 5 | Rechamada D+7 (%) | percent |
| 6 | CSAT | number |
| 7 | NR17 (%) | percent |
| 8 | Pessoal (%) | percent |
| 9 | Outras Pausas (%) | percent |

### Ordem visual

Mantida na ordem do `display_order` da tabela `kpi_definitions`. 
Layout 3×3 da esquerda pra direita, de cima pra baixo (idêntico ao 
atual-secundario):

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Tx Líq  │ │ Atendid │ │ Transf  │
└─────────┘ └─────────┘ └─────────┘

┌─────────┐ ┌─────────┐ ┌─────────┐
│ Short   │ │ Rech    │ │ CSAT    │
└─────────┘ └─────────┘ └─────────┘

┌─────────┐ ┌─────────┐ ┌─────────┐
│ NR17    │ │ Pessoal │ │ Outras  │
└─────────┘ └─────────┘ └─────────┘
```

## Estrutura visual

### Header

```
KPI / passado · secundário
🗓  Abril 2026  •  dados até 30/04
```

### Tabs

**Componente novo `KpiPassadoTabs`**, similar ao `KpiTabs` existente. 
Aparece tanto na página `/kpi/passado-principal` quanto nesta. 
Navega entre as duas:

```
[ PRINCIPAIS ] [ SECUNDÁRIOS ]
```

Mesmo estilo das tabs do mês atual.

### Bloco 1 — Grid de 9 cards uniformes

Grid responsivo:
- Desktop (≥ 1024px): 3 colunas × 3 linhas
- Tablet (640-1023px): 2 colunas × 5 linhas (último centralizado)
- Mobile (< 640px): 1 coluna × 9 linhas

Cada card usa o **mesmo componente `KpiMediumCard`** das páginas atuais, 
com a prop `neutral={true}`. Sem código novo.

### Bloco 2 — Estado vazio

Idêntico ao da página passado-principal:
- "Ainda não há mês passado para consultar" (banco vazio)
- "Sem dados do mês passado" (operador sem registro)

Reaproveita `KpiEmptyState` com props customizadas.

## Componentes a criar/reusar

**Criar:**
- `KpiPassadoTabs` em `src/components/kpi/kpi-passado-tabs.tsx`
  - Navega entre `/kpi/passado-principal` e `/kpi/passado-secundario`
  - Mesma estética do `KpiTabs` existente

**Reusar (já existem com prop neutral):**
- `KpiMediumCard` com `neutral={true}`
- `KpiEmptyState` com props `title` e `description`

## Funções de leitura

Criar em `src/lib/kpi/passado/`:

- `get-previous-month-secundario.ts` — análoga à 
  `get-previous-month-snapshot.ts`, mas filtra `groupType === "secundario"`

A função:

```typescript
export async function getPreviousMonthSecundario(
  operatorEmail: string,
): Promise<PreviousMonthSnapshot>
```

Retorna o mesmo tipo `PreviousMonthSnapshot` da página principal, 
apenas com os slugs secundários no `kpis` Map.

**Nota:** não precisa ler `tx_retencao_bruta` (que seria usada pro 
cálculo de diff no atual-secundario), porque aqui não há cor.

## Atualização na página passado-principal

A página `/kpi/passado-principal` precisa ganhar a renderização do 
`KpiPassadoTabs` no topo, **acima** do grid de cards.

Posicionamento idêntico ao `/kpi/atual-principal` (logo abaixo do header, 
antes do conteúdo).

## Sidebar

**Sem alteração.** A sidebar continua com apenas:
- Mês Atual → `/kpi/atual-principal`
- Mês Passado → `/kpi/passado-principal`

A navegação para a página secundário acontece **apenas via tabs** 
dentro da página.

## Estados

### Loading

Skeleton: 9 cards em grid 3×3 (estrutura idêntica ao atual-secundario, 
sem barras coloridas).

### Erro

- **Falha de leitura do Supabase:** "Erro ao carregar dados. Tentar novamente."

### Vazio

- Empty state substitui o grid (mesma lógica da passado-principal)

### Sucesso

Grid normal de 9 cards neutros.

## Animações de entrada

- Header + tabs com PageTransition
- 9 cards em stagger (delay incremental 0.06s entre cada, começando em 0.2s)

Mesma cadência do atual-secundario.

Easing `[0.16, 1, 0.3, 1]` em tudo.

## Auto-refresh

Sem auto-refresh. Mês passado é estático.

## Acessibilidade

- Cards com `aria-label` descritivo (ex: "NR17: 10.2%")
- Hierarquia de heading correta
- Estado vazio com `role="status"`

## Responsividade

- **Desktop (≥ 1024px):** grid 3×3
- **Tablet (640-1023px):** grid 2 colunas
- **Mobile (< 640px):** coluna única

## Observações

- Página inteiramente reaproveitável dos componentes existentes
- A única coisa nova é o componente `KpiPassadoTabs` e a função de 
  leitura específica
- A passado-principal precisa ser atualizada para também renderizar 
  o `KpiPassadoTabs`
- Sem regra especial pra Tx. Retenção Líquida 15d (não há cor)

## Versão

1.0 — criada antes da implementação.