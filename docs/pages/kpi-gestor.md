# KPI do Gestor (base própria, página "Meus Resultados", metas de gestor)

## Visão geral

Módulo de KPI do gestor, espelhando o KPI do operador mas com base, dados e
metas próprios. Três partes:
1. Upload da base de KPI dos gestores (2º card em /bases/kpi, ADM).
2. Página "Meus Resultados > KPI" — o gestor vê o próprio KPI (principais +
   secundários na mesma página), toggle atual/passado.
3. Metas de supervisor configuráveis pelo ADM (levemente diferentes das do
   operador).

Os dados do gestor ficam em tabela SEPARADA (kpi_gestor_snapshots), vinculados
pelo NOME do supervisor (não email). As metas em tabela própria
(kpi_metas_gestor).

## Parte 1 — Base de KPI dos gestores (upload)

### Onde
- Mesma página /bases/kpi (ADM, permissão manage_base).
- Um 2º CARD, abaixo do card de operadores: "Base de KPI dos Supervisores".
- Mesmo método: colar TSV do Excel num textarea + processar.

### Data compartilhada
- A data de corte e o mês são os MESMOS da base de operadores (compartilham a
  data do mês). O ADM já seleciona mês + data de corte no card de operadores;
  o card do gestor usa a mesma referência (ou repete o seletor, sincronizado).
- Decisão: o card do gestor herda o mes_ref/data_corte do contexto da página
  (mesmo seletor), pra garantir que gestor e operadores tenham a mesma data.

### Tabela nova: kpi_gestor_snapshots
kpi_gestor_snapshots (

supervisor_name text,      -- nome completo do supervisor (da planilha)

mes_ref date,              -- "YYYY-MM-01"

data_corte date,

kpi_slug text,

valor_numerico numeric,

valor_texto text,          -- se aplicável

updated_at timestamptz,

UNIQUE (supervisor_name, mes_ref, kpi_slug)

)
- supervisor_name em vez de operator_email.
- Mesma estrutura de slugs (reusa os kpi_slug existentes).

### Mapeamento das colunas (base do gestor → slug)
A primeira coluna é "Supervisor" (identidade, nome completo). As demais mapeiam
pros slugs existentes:

Supervisor → (identidade), Pedidos → pedidos, Churn → churn, Forecast Churn →
forecast_churn, % Variação Ticket → variacao_ticket, Tx. Retenção Bruta (%) →
tx_retencao_bruta, Tx. Retenção Liq. 15d (%) → tx_retencao_liquida_15d,
Atendidas → atendidas, Transfer (%) → transfer, Short Call (%) → short_call,
TMA → tma, Rechamada D+7 (%) → rechamada_d7, CSAT → csat, ABS (%) → abs,
NR17 (%) → nr17, Pessoal (%) → pessoal, Outras Pausas (%) → outras_pausas,
Indisponibilidade (%) → indisp_total.

Todos os 17 slugs já existem. O mapeamento de coluna→slug reusa o mecanismo
existente (expected_header das definitions), ou um mapa próprio pro gestor se
os cabeçalhos diferirem. Avaliar na implementação — provavelmente reusa o
expected_header (mesmos nomes de coluna).

### Fluxo (reusa o de operadores)
- Reusar parseClipboard (parse TSV tolerante).
- Novo processGestorSnapshotAction: extrai por supervisor_name, mapeia colunas
  → slugs, upsert em kpi_gestor_snapshots (onConflict supervisor_name+mes_ref+
  kpi_slug).
- Parse numérico igual (%, vírgula, tempo HH:MM:SS → segundos).

### Retenção
- Aplicar a MESMA política de retenção (manter só os 2 meses mais recentes).
- Criar enforceGestorRetention (espelhar enforceRetention) ou generalizar o
  existente pra aceitar o nome da tabela.

## Parte 2 — Metas de supervisor

### Tabela nova: kpi_metas_gestor
kpi_metas_gestor (

slug text PRIMARY KEY,

threshold_red numeric,

threshold_yellow numeric,

threshold_diff_percent numeric,

coloring_type text          -- pode herdar ou sobrescrever

)
- Isola as metas do gestor (não toca em kpi_definitions).
- Na exibição, mescla: usa kpi_definitions pra display_name, value_type,
  direction, coloring_type; substitui os THRESHOLDS pelos de kpi_metas_gestor.
- Slugs sem entrada em kpi_metas_gestor → cair pro default das definitions, ou
  exigir cadastro. Decidir: recomendado popular kpi_metas_gestor com os mesmos
  valores das definitions inicialmente (seed), e o ADM ajusta os que diferem.

### Config no ADM
- Nova aba em /config/kpi (ou página /config/kpi-gestor): "Metas de Supervisor".
- KpiDefinitionGestorCard espelhando o KpiDefinitionCard existente, mas salva em
  kpi_metas_gestor (updateKpiGestorMetaAction espelhando updateKpiDefinitionAction).
- Campos: threshold_red, threshold_yellow (ou threshold_diff_percent no modo
  diff), por slug.

## Parte 3 — Página "Meus Resultados > KPI" (gestor)

### Sidebar
Novo grupo na sidebar do gestor:
🎯 Meus Resultados

KPI
- Grupo "Meus Resultados", sub-item "KPI" → /meus-resultados/kpi
- onlyRoles: ["GESTOR"]

### Conteúdo
- O gestor vê o PRÓPRIO KPI (não da equipe).
- Principais + Secundários na MESMA página (não em páginas separadas como o
  operador).
- Mesmo formato visual do operador: TxRetencaoHeroCard + grids de KpiMediumCard.
- Toggle de mês: só ATUAL e PASSADO (sem retrasado).
  - Atual → com cores de status (metas de gestor).
  - Passado → neutro (NeutralKpiValue, sem cor).

### Matching do gestor
- Identifica o gestor logado pelo full_name do profile.
- Busca em kpi_gestor_snapshots por supervisor_name via ILIKE das 2 primeiras
  palavras (mesma estratégia robusta a casing dos outros painéis).
  Ex: "Ana Angelica Mattos Goncalves" → ILIKE '%ANA ANGELICA%'.

### Camada de dados
- getKpiGestorProprio(fullName, mesRef): busca os KPIs do gestor em
  kpi_gestor_snapshots (todos os slugs), enriquece com enrichWithDefinitions
  usando as metas de kpi_metas_gestor (thresholds do gestor).
- Atual: enriquecido com cor. Passado: neutro.
- Reusar: enrichWithDefinitions (com metas do gestor), formatKpiValue,
  KpiMediumCard, TxRetencaoHeroCard.

## Reuso (não recriar)

- parseClipboard (upload), processSnapshotAction como base.
- enrichWithDefinitions (aceita definitions + valuesBySlug; passar os thresholds
  do gestor).
- KpiMediumCard, TxRetencaoHeroCard, formatKpiValue, getStatusColor.
- O toggle de mês (padrão do kpi-equipe-section).
- A config (KpiDefinitionCard → espelhar pro gestor).

## Decisões técnicas

- Tabela separada kpi_gestor_snapshots (supervisor_name, não email) — não
  contamina os cálculos de operador (equipe, quartil).
- Metas em tabela separada kpi_metas_gestor (opção b) — isola, não toca na
  central.
- Data compartilhada com a base de operadores (mesmo mês/corte).
- Retenção de 2 meses também na tabela do gestor.
- Matching por nome (2 primeiras palavras, ILIKE) — robusto a casing.
- Principais + secundários juntos na página do gestor.

## Ordem de implementação (fatias)

1. Banco: criar kpi_gestor_snapshots + kpi_metas_gestor (SQL). Seed das metas
   de gestor com os valores atuais das definitions.
2. Upload: 2º card em /bases/kpi + processGestorSnapshotAction + retenção.
3. Metas: aba "Metas de Supervisor" no /config/kpi + update action.
4. Página "Meus Resultados > KPI": leitura + exibição (reuso dos componentes).

## Evolução futura (fora do escopo)

- Comparação do gestor vs média dos gestores.
- Quartil de gestores (ranking entre supervisores).
- Histórico além de 2 meses.

## Versão

1.0 — KPI do gestor: base própria, metas próprias, página Meus Resultados.