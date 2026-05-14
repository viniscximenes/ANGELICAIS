# KPI — Atual Principal

## Objetivo

Apresentar ao operador os 7 KPIs principais do mês corrente, em cards 
visuais com coloração condicional (verde/vermelho/amarelo) conforme 
metas configuradas em `kpi_definitions`.

A página é a "vitrine" do esforço mensal do operador: ele abre, bate 
o olho e sabe se está no caminho da meta ou não. Cada usuário vê 
exclusivamente os seus próprios números.

## Rota

`/kpi/atual-principal`

Acesso à rota raiz `/kpi` redireciona automaticamente para 
`/kpi/atual-principal`.

## Quem acessa

- **OP / AUX / ADM** veem apenas os próprios cards
- **GESTOR** é redirecionado para `/gestor/d-1`

Não há visão de equipe nesta página. Todos os perfis operacionais 
têm a mesma visualização: seus 7 KPIs pessoais.

## Lógica de negócio

### Origem dos dados

Lê da tabela `kpi_monthly_snapshots`, filtrando pelo **mês corrente** 
(primeiro dia do mês atual, formato `YYYY-MM-01`) e pelo email 
corporativo do usuário logado.

Cruza com `kpi_definitions` pra saber:
- Quais KPIs são "principais" (`group_type = 'principal'`)
- Qual a meta de cada um
- Como colorir (binary, three_tier, per_row, none)

### Operador sem dados no mês

Quando o usuário logado **não tem** snapshot no mês corrente (não 
estava na última colagem, foi cadastrado depois, ou estava ausente), 
a página exibe um estado vazio: ícone + microcopy "Sem dados de KPI 
para este mês. Fale com seu administrador."

### Hora do snapshot

Cada linha do banco tem `data_corte` (até quando o dado é válido) e 
`updated_at` (quando foi salvo). Mostrar no header da página:
- Mês corrente em destaque ("Maio / 2026")
- "Dados até DD/MM" (data_corte do registro do operador)
- "Atualizado em DD/MM às HH:MM" (updated_at do registro do operador)

## Fonte de dados

Combina 3 tabelas Supabase em queries leves:

- `kpi_monthly_snapshots` — valores (filtrados pelo email do usuário 
  + mês atual)
- `kpi_definitions` — metas e tipo de coloração de cada KPI
- `profiles` — fornece o email corporativo do usuário logado (já 
  vem via `getCurrentUser()`)

### Os 7 KPIs principais

| # | Nome interno | Tipo | Coloração |
|---|---|---|---|
| 1 | Tx. Retenção Bruta (%) | percent | three_tier (config) |
| 2 | Pedidos | number | per_row (Forecast Pedidos Mês) |
| 3 | Churn | number | per_row (Forecast Churn Mês) |
| 4 | % Variação Ticket | percent_negative | none |
| 5 | TMA | time | binary (config) |
| 6 | ABS (%) | percent | binary (config) |
| 7 | Indisp Total (%) | percent | binary (config) |

### Ordem de importância visual (do mais ao menos)

1. **Tx. Retenção Bruta** — card grande no topo (hero)
2. **Indisp Total** — card médio
3. **TMA** — card médio
4. **ABS** — card médio
5. **Pedidos** — card médio
6. **Churn** — card médio
7. **% Variação Ticket** — card médio

A hierarquia mostra que retenção é o KPI mestre, e os 6 secundários 
são complementos.

## Estrutura visual

### Header

```