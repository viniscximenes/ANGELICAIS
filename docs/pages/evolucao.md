# Evolução — Painel de evolução mensal do operador

## Visão geral

Painel onde o operador vê a própria evolução mês a mês nos principais KPIs.
Cada ponto do gráfico é um mês fechado; a linha mostra como o indicador subiu
ou caiu ao longo do tempo de empresa do operador.

Cada operador vê apenas o seu próprio histórico. ADM e AUX também são
operadores e veem a evolução deles (não a de terceiros — por enquanto).

## Escopo

- Granularidade: mensal. Cada ponto = um mês existente no kpi_monthly_snapshots do operador.
- Fonte: bases de KPI já salvas no sistema (os meses que aparecem no Base do KPI). Sem dependência de dados diários.
- Indicadores: Tx de Retenção, Pedidos, Indisponibilidade, ABS, TMA.
- Adaptativo: operador antigo pode ter 20+ meses; novato, 3. O eixo X se ajusta à quantidade de meses, com rolagem horizontal quando há muitos pontos.

## Estrutura de rotas e sidebar

Nova seção na sidebar, abaixo de RV:

    💰 RV
       Estimativa Atual
       Estimativa Passado

    📈 Evolução
       KPI
       (Quartil — futuro, não agora)

Rota: /evolucao/kpi

A guia "Quartil" fica documentada como evolução futura, mas NÃO é implementada
agora — só a guia KPI.

## Quem acessa

- OP / AUX / ADM → veem /evolucao/kpi com o próprio histórico.
- GESTOR → fora do escopo inicial (mesma regra do RV: tratado depois).

Visão de "evolução de qualquer operador" (seleção por gestão) é evolução
futura — não entra agora.

## Guia "KPI"

### Gráfico de linha (principal)

Gráfico de linha único, com tabs pra trocar qual indicador está sendo exibido:

    [ Tx Retenção ] [ Pedidos ] [ Indisponibilidade ] [ ABS ] [ TMA ]

- Eixo X: meses do operador, do mais antigo pro mais recente.
- Eixo Y: valor do indicador selecionado.
- Uma linha (a evolução daquele indicador para aquele operador).
- Pontos com o valor de cada mês.

Adaptação ao volume de meses:
- Poucos meses (ex: novato com 3): gráfico ocupa a largura normal, pontos espaçados.
- Muitos meses (ex: 20+): largura mínima por ponto + rolagem horizontal no container do gráfico, pra não comprimir os pontos a ponto de ficarem ilegíveis.

### Consolidado (ao lado / abaixo do gráfico)

Um valor consolidado do indicador atualmente selecionado na tab, considerando
todos os meses do operador.

Regra de cálculo do consolidado, por indicador:

- Tx de Retenção: acumulado real do período — soma(pedidos − churn) de todos os meses / soma(pedidos) de todos os meses. (Não é média das TX mensais — média de percentual distorce; o acumulado real reflete a taxa verdadeira do período.)
- Pedidos, Indisponibilidade, ABS, TMA: média dos valores mensais.

O consolidado muda junto com a tab: ao selecionar "ABS", mostra a média de ABS
de todos os meses; ao selecionar "Tx Retenção", mostra o acumulado real.

Exibição sugerida:

    ┌──────────────────────────────────────────┐
    │ TX DE RETENÇÃO — CONSOLIDADO              │
    │            63,4%                           │
    │   acumulado de 5 meses (Fev–Jun)           │
    └──────────────────────────────────────────┘

(O rótulo "acumulado" vs "média" muda conforme o indicador, pra ser honesto
sobre o que o número representa.)

## Modelo de dados

Sem tabelas novas. O painel lê do kpi_monthly_snapshots já existente.

Slugs usados por indicador:
- Tx Retenção: tx_retencao_bruta (linha) + pedidos e churn (acumulado real do consolidado).
- Pedidos: pedidos.
- Indisponibilidade: indisp_total.
- ABS: abs.
- TMA: tma.

### Atenção: teto de 1000 linhas do PostgREST

Igual ao problema resolvido no Base do KPI: kpi_monthly_snapshots tem milhares
de linhas por mês. Mas buscar "todos os meses de UM operador" filtrando por
operator_email retorna poucas linhas (1 por mês por slug), então não esbarra no
teto — desde que a query filtre por operador e pelos slugs necessários, sem
puxar a tabela inteira.

## Funções de leitura/cálculo

Em src/lib/evolucao/:
- types.ts — tipos do painel (ponto de evolução, série por indicador, consolidado).
- get-evolucao-operador.ts — lê os meses do operador logado, monta as séries por indicador (mês → valor) e calcula o consolidado de cada um.
- compute-consolidado.ts — função pura: recebe os meses e retorna o consolidado por indicador (acumulado real pra TX, média pro resto). Testável isoladamente.

## Componentes

Em src/components/evolucao/:
- evolucao-tabs.tsx — tabs de seleção de indicador.
- evolucao-grafico.tsx — gráfico de linha (Recharts), com rolagem horizontal adaptativa ao número de meses.
- evolucao-consolidado-card.tsx — card do valor consolidado do indicador ativo.
- evolucao-empty-state.tsx — estado quando o operador tem 0 ou 1 mês.

## Estados

- Loading: skeleton no gráfico e no card de consolidado.
- Vazio (0 meses): "Sem histórico de KPI ainda. A evolução aparece conforme os meses são fechados."
- 1 mês só (novato): mostrar o ponto único + o consolidado, com aviso leve "Evolução aparece a partir do 2º mês."
- Erro: "Erro ao carregar a evolução. Tentar novamente."
- Sucesso: gráfico + consolidado renderizados.

## Decisões técnicas

Por que mensal e não diário: os dados diários (D-1) não são persistidos
historicamente — o sistema só guarda o dia atual. O kpi_monthly_snapshots
guarda meses fechados, que é a granularidade desejada.

Por que TX é acumulado real e o resto é média: TX tem numerador e denominador
disponíveis (pedidos, churn), então dá pra calcular a taxa verdadeira do
período. Indisp, ABS e TMA são armazenados só como valor final do mês (sem os
componentes brutos), então só a média é calculável.

Por que sem tabelas novas: o painel é puramente de leitura sobre dados que já
existem. Não cria nem altera dado.

Adaptação a 3 vs 20+ meses: largura mínima por ponto + rolagem horizontal, em
vez de comprimir tudo numa largura fixa.

## Evolução futura (fora do escopo atual)

- Guia "Quartil" dentro de Evolução (já reservada na sidebar).
- Visão de gestão: ADM/AUX/GESTOR vendo a evolução de qualquer operador.
- Comparação entre operadores no mesmo gráfico.
- Exportar PNG/PDF da evolução.

## Versão

1.0 — especificação inicial do painel de Evolução, guia KPI.