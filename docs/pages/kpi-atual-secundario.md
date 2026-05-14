# KPI — Atual Secundário

## Objetivo

Apresentar ao operador os 9 KPIs secundários do mês corrente, em cards 
visuais distribuídos uniformemente em grid 3×3. Cada usuário vê 
exclusivamente os seus próprios números.

A página complementa o `/kpi/atual-principal`, mostrando indicadores 
de apoio (taxa de retenção líquida, atendidas, transferências, etc.). 
Ambas as páginas se navegam via tabs no topo.

## Rota

`/kpi/atual-secundario`

## Quem acessa

- **OP / AUX / ADM** veem apenas os próprios cards
- **GESTOR** é redirecionado para `/gestor/d-1`

## Lógica de negócio

### Origem dos dados

Mesma origem da `/kpi/atual-principal`:

- `kpi_monthly_snapshots` — valores do mês corrente, filtrados pelo 
  email do usuário logado
- `kpi_definitions` — metas e tipo de coloração (filtrar por 
  `group_type = 'secundario'`)

### Operador sem dados no mês

Mesmo comportamento da página principal: se o usuário não tem snapshot 
do mês corrente, exibe estado vazio "Sem dados de KPI para este mês".

### Caso especial — Tx. Retenção Líquida 15d

Esse KPI tem coloração via `threshold_diff_percent`, comparando contra 
a Tx. Retenção Bruta do mesmo operador:

- 🟢 Verde se `(tx_bruta - tx_liquida) <= threshold_diff_percent`
- 🔴 Vermelho caso contrário
- ⚪ Neutro se algum dos dois valores for null

Por isso, ao buscar dados desta página, precisamos **também** ler o 
valor de Tx. Retenção Bruta (mesmo que ela seja "principal"), só para 
fazer essa comparação.

### Hora do snapshot

Header mostra:
- Mês corrente em destaque
- "Dados até DD/MM" (data_corte do snapshot do operador)

Sem timestamp de "atualizado em" (já que essa info não agrega valor 
ao operador).

## Fonte de dados

### Os 9 KPIs secundários

| # | Nome interno | Tipo | Coloração |
|---|---|---|---|
| 1 | Tx. Retenção Líquida 15d (%) | percent | diff_from_bruta |
| 2 | Atendidas | number | none |
| 3 | Transfer (%) | percent | binary (config) |
| 4 | Short Call (%) | percent | binary (config) |
| 5 | Rechamada D+7 (%) | percent | binary (config) |
| 6 | CSAT | number | none |
| 7 | NR17 (%) | percent | binary (config) |
| 8 | Pessoal (%) | percent | none |
| 9 | Outras Pausas (%) | percent | none |

### Ordem visual

Mantida na ordem do `display_order` da tabela `kpi_definitions`. 
Layout 3×3 da esquerda pra direita, de cima pra baixo:

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
KPI / atual · secundário
🗓  Maio 2026  •  dados até 13/05
```

### Tabs

Tab "Secundários" ativa. Tab "Principais" leva pra `/kpi/atual-principal`.

### Bloco 1 — Grid de 9 cards uniformes

Grid responsivo:
- Desktop (≥ 1024px): 3 colunas × 3 linhas
- Tablet (640-1023px): 2 colunas × 5 linhas (último centralizado)
- Mobile (< 640px): 1 coluna × 9 linhas

Cada card usa o **mesmo componente `KpiMediumCard`** dos cards médios 
da página principal. Reaproveitamento total — sem componente novo.

**Tratamento por KPI:**

- **Tx. Retenção Líquida 15d:** coloração via diff sobre bruta (regra 
  especial, requer enriquecimento adicional na função de leitura)
- **Atendidas, CSAT, Pessoal, Outras Pausas:** sem coloração, texto 
  branco padrão
- **Transfer, Short Call, Rechamada D+7, NR17:** binárias (verde se 
  ≤ threshold, vermelho caso contrário)

### Bloco 2 — Estado vazio

Idêntico ao da página principal: card centralizado, ícone, microcopy 
"Sem dados de KPI para este mês. Fale com seu administrador."

Substitui o grid de cards inteiramente quando o operador não tem 
snapshot.

## Componentes a criar/reusar

**Reusar (sem mudanças):**
- `KpiTabs` (compartilhado)
- `KpiMediumCard` (reusa o card médio da página principal)
- `KpiEmptyState` (reusa o empty state)

**Possível ajuste no `KpiMediumCard`:**
Atualmente trata os 4 tipos de coloração (`none`, `binary`, `per_row`, 
`three_tier`). Adicionar suporte para o caso especial de 
`thresholdDiffPercent` (Tx. Retenção Líquida 15d).

**Alternativa:** tratar a coloração da Tx. Retenção Líquida 15d no 
enriquecimento de dados (server-side), retornando um `status` já 
calculado. O `KpiMediumCard` então não precisa de lógica nova — só 
recebe o status pronto.

**Recomendo essa alternativa.**

## Funções de leitura

Criar em `src/lib/kpi/atual/`:

- `get-current-month-secundario.ts` — busca os snapshots dos 9 KPIs 
  secundários, mais a Tx. Retenção Bruta (apenas pra cálculo da diff)
- Reaproveitar `enrich-with-definitions.ts` mas estender a função 
  `computeStatus` para tratar o caso `binary` quando `thresholdDiffPercent` 
  está presente (compara `bruta - liquida` contra esse valor)

## Estados

### Loading

Skeleton: 9 cards em grid 3×3.

### Erro

Card central "Erro ao carregar dados. Tentar novamente."

### Vazio

Empty state substitui o grid.

### Sucesso

Grid normal de 9 cards.

## Animações de entrada

- Header + tabs com PageTransition
- 9 cards em stagger (delay incremental 0.06s entre cada, começando em 0.2s)

Mais rápido que a página principal (lá são 7 cards com delays maiores 
porque tem o hero). Aqui são 9 cards iguais — convém acelerar pra não 
ficar entediante.

Easing `[0.16, 1, 0.3, 1]` em tudo.

## Auto-refresh

Sem auto-refresh, mesmo motivo da página principal.

## Acessibilidade

Mesma da página principal:
- Cards com `aria-label` descritivo
- Hierarquia de heading correta
- Estado vazio com `role="status"`

## Responsividade

- **Desktop (≥ 1024px):** grid 3×3
- **Tablet (640-1023px):** grid 2 colunas, 9º card centralizado
- **Mobile (< 640px):** coluna única

## Observações

- Página inteiramente **reaproveitável** dos componentes da principal
- Diferença principal: tratamento da Tx. Retenção Líquida 15d (diff 
  sobre bruta) — implementar na função de leitura, não no componente
- Os 4 KPIs sem coloração (Atendidas, CSAT, Pessoal, Outras Pausas) 
  são meramente informativos — operador vê o número, sem julgamento de 
  bom/ruim
- A função de leitura desta página precisa buscar **mais slugs** que 
  a principal (9 secundários + tx_retencao_bruta), mas é uma única query

## Versão

1.0 — criada antes da implementação. Atualizar após criar função de 
leitura específica e validar visualmente.