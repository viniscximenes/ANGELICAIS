# Operacional — Quartil (gestor)

## Visão geral

Sub-página dentro do grupo "Operacional", ao lado de KPI. Mostra, para cada
operador da equipe do gestor, o QUARTIL (Q1 a Q4) e o RANK em cada KPI —
principais e secundários. Q1 = melhores 25%, Q4 = piores 25%. Um toggle alterna
o universo de comparação: dentro da equipe ou na empresa toda.

Usa os mesmos dados do KPI (mês atual), mas calcula posição/quartil em vez de
só exibir valores.

## Escopo

- Quartil + rank POR TÓPICO (cada KPI tem seu próprio quartil e rank — não é
  um score combinado).
- Principais e secundários.
- Toggle: comparação dentro da equipe vs na empresa toda.
- Só mês atual (sem mês passado).
- Mostra, por operador e por KPI: o quartil (Q1-Q4), o rank e o valor do KPI.

## Quem acessa

- Role GESTOR (mesmo do KPI). Cada gestor vê só os operadores da própria
  equipe — mesmo no modo empresa, só os Q/rank dos SEUS operadores aparecem
  (os outros entram na conta mas não são exibidos).

## Sidebar

Dentro do grupo "Operacional":
🧭 Operacional

KPI

Quartil

- Sub-item "Quartil" → /operacional/quartil
- Só pra role GESTOR (mesmo onlyRoles).

## Cálculo do quartil (por tópico)

Para cada KPI, separadamente:

1. Ordenar os operadores do universo (equipe ou empresa) pelo valor daquele
   KPI, respeitando a DIREÇÃO do indicador:
   - higher_better (ex: tx_retencao_bruta, pedidos) → maior valor = melhor
   - lower_better (ex: tma, abs, indisp_total, churn) → menor valor = melhor
   - O melhor fica em 1º (rank 1).
2. Dividir a lista ordenada em 4 grupos de 25% cada:
   - Q1 = os 25% melhores (topo da ordenação)
   - Q2 = os 25% seguintes (bons)
   - Q3 = os 25% seguintes (médios)
   - Q4 = os 25% piores (fundo)
3. Cada operador recebe, naquele KPI: o quartil (Q1-Q4) e o rank (posição na
   ordenação, 1 = melhor).

Quartil por POSIÇÃO (não por faixa de valor): cada quartil tem ~25% dos
operadores. Com N operadores, o tamanho de cada quartil é N/4 (arredondar de
forma consistente; ver Detalhes).

### Direção por KPI

Respeitar o campo direction das kpi_definitions (higher_better / lower_better).
KPIs informativos (direction none, ex: variacao_ticket, csat, atendidas) —
decidir: ou não calcular quartil (não fazem sentido pra ranquear), ou ranquear
numa direção padrão. Recomendado: NÃO calcular quartil pros informativos (sem
direção definida) — mostrar só o valor. Reportar/confirmar na implementação
quais KPIs têm direção e quais não.

### Operadores sem valor

Operador sem valor naquele KPI (null) → fica FORA da ordenação daquele KPI
(não recebe quartil/rank nele; exibir "—"). Não contar no total pra divisão
dos 25% daquele KPI.

## Toggle: equipe vs empresa

Toggle na página alterna o UNIVERSO de comparação:

- **Equipe:** o quartil e o rank são calculados só entre os operadores da
  equipe do gestor. Ex: Caio (65% TX) → Q1, rank 3 de 24.
- **Empresa:** o quartil e o rank consideram TODOS os operadores da empresa
  (todas as equipes, todos os operadores no KPI do mês), mas só os operadores
  da equipe do gestor são EXIBIDOS. Ex: Caio (65% TX) → Q2, rank 23 de ~180.
  Os operadores de outras equipes entram no cálculo mas NÃO aparecem na tela.

Empresa toda = todos os operadores com KPI no mês atual (independente de
gestor).

O toggle recalcula quartil/rank no universo escolhido. Ambos os universos podem
ser pré-carregados pra alternar sem refetch (a empresa é ~180 operadores ×
~16 KPIs ranqueáveis — calcular os dois no carregamento).

## O que exibe (por operador, por KPI)

Para cada operador e cada KPI:
- Quartil: Q1 / Q2 / Q3 / Q4 (Q1 destacado como melhor, Q4 como pior — cor)
- Rank: posição (ex: "3" ou "3º"; mostrar o total ajuda: "3/24")
- Valor: o valor do KPI formatado (TX em %, TMA em HH:MM:SS, etc — formatKpiValue)

## Estrutura da página

### Toggle (topo)
- "Equipe | Empresa" — alterna o universo de comparação.

### Lista/tabela
- Operadores nas linhas, KPIs nas colunas (como a página de KPI).
- Mas cada célula mostra: Quartil + Rank + Valor (em vez de só o valor).
  - Ex de célula: "Q1 · #3 · 65,0%"
  - Ou um layout compacto: valor grande, quartil como badge colorido, rank pequeno.
- Cor por quartil: Q1 verde, Q2 verde-claro/azul, Q3 amarelo, Q4 vermelho 
  (gradiente do melhor pro pior). Definir paleta na implementação.
- Ordem das colunas: seguir a mesma da página de KPI (Operador, Tx Retenção,
  Indisponibilidade, TMA, ABS, Churn, Pedidos, Ticket) + os secundários.
- Talvez separar principais e secundários (duas tabelas ou seções), como o KPI.

Formato da célula (quartil + rank + valor numa célula só) é o desafio visual —
avaliar na implementação o layout mais legível. Badge de quartil colorido +
valor + rank pequeno costuma funcionar.

## Camada de dados

Reusa a leitura do KPI (getKpiEquipeGestor e a query batch), mas precisa de
DOIS universos:
- Equipe: os operadores do gestor (já temos via getOperadoresDoGestor).
- Empresa: TODOS os operadores do mês (nova busca — todos os operator_email
  distintos do mês atual no kpi_monthly_snapshots).

Funções a criar:
- getQuartilEquipe(fullName, mesRef): calcula quartil/rank de cada operador da
  equipe DENTRO da equipe.
- getQuartilEmpresa(fullName, mesRef): calcula quartil/rank dos operadores da
  equipe DENTRO do universo da empresa (busca todos, ranqueia todos, filtra a
  exibição pros da equipe).
- Função pura computeQuartis(operadores, definitions): dado um conjunto de
  operadores e os KPIs, calcula por KPI a ordenação (respeitando direção), o
  rank e o quartil de cada um. Reutilizável pros dois universos.

Atenção ao teto de 1000 linhas no modo empresa: ~180 operadores × 22 slugs =
~4000 linhas. ISSO ESTOURA o teto de 1000. Resolver:
- Paginar a leitura, OU
- Usar uma RPC que agregue/retorne no banco, OU
- Buscar só os slugs ranqueáveis (principais + secundários com direção) pra
  reduzir, mas ainda pode passar de 1000.
RECOMENDADO: criar uma RPC (função Postgres) que retorne os dados do mês pra
todos os operadores, ou paginar. Tratar na implementação — é um ponto de
atenção real (diferente da página de KPI que era só a equipe, ~528 linhas).

## Detalhes do cálculo

- Divisão dos 25%: com N operadores, cada quartil ~N/4. Definir o arredondamento
  (ex: Q1 = primeiros ceil(N/4), etc) de forma consistente. Documentar a regra
  escolhida pra empates de fronteira.
- Empates de valor: operadores com o mesmo valor — decidir o desempate (mesma
  posição? ordem estável?). Manter simples: ordenação estável, rank sequencial.
- Direção: higher_better ordena desc (maior primeiro); lower_better ordena asc
  (menor primeiro). O rank 1 é sempre o melhor.

## Decisões técnicas

- Quartil POR TÓPICO (cada KPI independente), POR POSIÇÃO (25% cada), 
  respeitando a direção do KPI.
- Reusa dados e definições do KPI; adiciona o cálculo de ordenação/quartil.
- Modo empresa exige ler todos os operadores do mês (atenção ao teto de 1000 —
  RPC ou paginação).
- Só mês atual.
- No modo empresa, outras equipes entram no cálculo mas não na exibição.

## Evolução futura (fora do escopo)

- Quartil consolidado (score único) — não é o caso aqui.
- Histórico de quartil (evolução do rank ao longo dos meses).

## Versão

1.0 — Quartil por tópico (Q1-Q4 + rank + valor), toggle equipe/empresa, mês
atual, grupo Operacional.