# Dashboard de Retenção — Fase 2: o painel analítico

## Visão geral

Painel analítico da base de retenção (armazenada no banco na Fase 1). Só para
GESTOR. Mostra os dados da equipe do gestor OU da empresa inteira (toggle),
com as mesmas métricas. Um painel de decisão: além dos números, destaca o que
precisa de atenção (alertas) e decompõe as quedas (quem causou).

## Acesso e escopo

- Role GESTOR apenas.
- Toggle EQUIPE / EMPRESA no topo:
  - EQUIPE: só os operadores da equipe do gestor.
  - EMPRESA: toda a base (o supervisor às vezes cuida da operação como um todo).
  - Mesmas métricas/blocos, escopo diferente. Tudo recalcula ao alternar.
- Equipe do gestor: os operadores gerenciados na config do D-1 (a tela que
  adiciona nome.sobrenome@alloha.com nas guias). Cruzar por usuario_login com a
  base de retenção (retencao_atendimentos).

## Fonte de dados

- Tabela retencao_atendimentos (Fase 1).
- Regra retido/cancelado: foi_cancelamento (false = retido, true = cancelado).
- TX de retenção = retidos / (retidos + cancelados).
- Evolução: por hora_bucket (hora cheia).

## Filtros

- Toggle Equipe / Empresa (escopo).
- Filtro de período do dia (faixa de horas, ex: só das 14h às 20h) — filtra por
  hora_bucket.
- (Filtro de equipe já é o toggle; dentro de Empresa, poder filtrar por marca/
  equipe é desejável — avaliar.)

## Sidebar

- Grupo novo "Dashboard", sub-item "Retenção" → /dashboard/retencao.
- onlyRoles: ["GESTOR"].
- Nome distinto do "D-1 Consolidado" (que é outra coisa).

## Blocos (na ordem de prioridade)

### 1. Visão geral (topo)
- Cards: TX de retenção, total de atendimentos, retidos, cancelados.
- No escopo selecionado (equipe ou empresa).
- A TX usa a meta editável do gestor pra colorir (ver módulo de meta).

### 2. Por tema (MOTIVO / SUBMOTIVO)
- Tabela/gráfico por MOTIVO: total, retidos, cancelados, TX.
- Drill-down: abrir o SUBMOTIVO dentro de cada motivo.
- Ordenável; destacar os que mais cancelam (piores no topo).

### 3. Evolução por hora
- Gráfico de linha: TX por hora (hora_bucket) ao longo do dia.
- Volume por hora (quantos atendimentos em cada hora).
- Respeita o filtro de período.

### 4. Detecção de queda + quem derrubou
- Destacar as horas onde a TX caiu vs a hora anterior.
- Nessas quedas, mostrar quem/o que derrubou (ver bloco 10 — contribuição).

### 5. Por segmento (MARCA / UNIDADE / EQUIPE)
- TX por marca (Sumicity...), por unidade, por equipe.
- Comparação entre segmentos (dentro do escopo).

### 6. Por operador (USUÁRIO)
- TX por operador, volume, retidos/cancelados.
- Os que mais retêm e os que mais cancelam.

## Blocos analíticos (inteligência)

### 7. Quartil de TX (operadores)
- Ranqueia os operadores pela TX de retenção: Q1 (melhores) → Q4 (piores).
- Reusar o conceito de quartil do módulo Operacional (compute-quartis), aplicado
  à base de retenção.
- No escopo (equipe ou empresa).

### 8. Matriz volume × taxa (temas urgentes)
- Cruzar MOTIVO: volume (quantos atendimentos) × TX (retenção).
- Destacar o quadrante "alto volume + baixa TX" = os temas que mais sangram a
  operação (prioridade de ação).
- Visual: scatter/quadrante ou tabela ordenada por "impacto" (volume × (1-TX)).

### 9. Alertas automáticos (o que precisa de atenção)
- O dashboard destaca sozinho o que está fora do padrão. Cards de alerta no topo:
  - Motivo com TX muito abaixo da média geral.
  - Operador com sequência/proporção alta de cancelamentos.
  - Marca/segmento que caiu na última hora.
- Regras de "fora do padrão": definir limiares (ex: TX de um item X pontos abaixo
  da média do escopo; operador com % de cancelamento acima de um corte).
  Começar com regras simples e ajustáveis. Reportar os limiares escolhidos.

### 10. Contribuição para a queda (decomposição)
- Quando a TX cai entre duas horas, decompor: quanto cada tema/operador
  contribuiu pra essa queda.
- Ex: "TX caiu 5 pontos das 14h→15h; 60% da queda veio do motivo Financeiro,
  30% do operador João."
- Cálculo: comparar a composição de cancelamentos das duas horas; atribuir a
  queda proporcionalmente aos itens que mais aumentaram cancelamento / caíram
  em retenção.
- Conecta com o bloco 4 (detecção de queda): a queda é detectada ali, a
  decomposição explica aqui.

## Métricas base (cálculo)

- TX de retenção = retidos / (retidos + cancelados), no recorte.
- Retido = foi_cancelamento false; Cancelado = true.
- Por dimensão: agrupar por motivo, submotivo, marca, unidade, equipe,
  usuario_login, hora_bucket.
- Todas respeitam o escopo (equipe/empresa) e o filtro de período.

## Camada de dados

- Queries de agregação no banco (retencao_atendimentos), por dimensão.
- Filtro de escopo: EQUIPE → where usuario_login in (emails da equipe do gestor);
  EMPRESA → sem filtro de operador.
- Filtro de período → where hora_bucket between X and Y.
- Funções por bloco: getVisaoGeral, getPorTema, getEvolucaoHora, getQuedas,
  getPorSegmento, getPorOperador, getQuartil, getMatrizVolumeTaxa, getAlertas,
  getContribuicaoQueda.
- Otimizar: os índices da Fase 1 (motivo, marca, equipe, usuario_login,
  hora_bucket, foi_cancelamento) cobrem as agregações.

## Meta editável (integra aqui)

- A TX de retenção usa a meta do gestor (editável, 1 nível, vermelho abaixo do
  valor) — feature pequena, pode vir junto ou antes. Persistida por gestor.
- Onde a TX aparece (visão geral, por tema, etc), colorir conforme a meta.

## Implementação em fatias

Ordem sugerida (validar cada uma):
1. Estrutura base: rota, sidebar, toggle Equipe/Empresa, filtro de período,
   mapeamento da equipe (usuario_login × config D-1).
2. Bloco 1 (Visão geral) + Bloco 2 (Por tema).
3. Bloco 3 (Evolução) + Bloco 4 (Queda).
4. Bloco 10 (Contribuição pra queda) — liga com o 4.
5. Bloco 5 (Segmento) + Bloco 6 (Operador).
6. Bloco 7 (Quartil) + Bloco 8 (Matriz) + Bloco 9 (Alertas).
7. Meta editável (colorir a TX).

## Decisões técnicas

- Toggle Equipe/Empresa recalcula tudo (não é comparativo lado a lado).
- Equipe via config do D-1 (usuario_login).
- Agregações no banco (rápido, índices da Fase 1).
- Alertas com limiares simples e ajustáveis.
- Contribuição pra queda: decomposição proporcional entre duas horas.

## Evolução futura

- Histórico por dia (comparar dias) — depende da Fase 1 guardar histórico.
- Exportação do dashboard (PNG/PDF).
- Mais dimensões (STATUS_CONTRATO, STATUS_RETENÇÃO) se úteis.

## Versão

1.0 — Dashboard de Retenção: painel analítico da base, escopo equipe/empresa,
com inteligência (alertas, contribuição pra queda, quartil, matriz).