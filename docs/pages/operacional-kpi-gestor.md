# Operacional — KPI da Equipe (gestor)

## Visão geral

Novo grupo "Operacional" na sidebar, com a sub-página "KPI". O gestor vê o KPI
de todos os operadores da sua equipe: uma lista com os indicadores PRINCIPAIS
de cada operador, e ao clicar num operador, abre o detalhe com os indicadores
SECUNDÁRIOS. Reaproveita todo o sistema de KPI já existente (definições, metas,
cores, componentes).

## Escopo

- Lista dos operadores da equipe do gestor com KPIs principais.
- Detalhe ao clicar: KPIs secundários do operador.
- Mês atual por padrão; mês passado via toggle na própria página.
- Reusa kpi_definitions, metas, lógica de cor e componentes de KPI existentes.

## Quem acessa

- Role GESTOR (o gestor = supervisor; mesma pessoa, mesmo login).
- Cada gestor vê só os operadores da própria equipe.

## Sidebar

Novo grupo na sidebar:
🧭 Operacional

KPI

- Grupo: "Operacional"
- Sub-item: "KPI" → rota /operacional/kpi
- Visível só pra role GESTOR (mesmo onlyRoles dos outros painéis do gestor).

## Vínculo equipe — matching do gestor

O operador é vinculado ao gestor pelo campo meta_gestor no KPI
(kpi_monthly_snapshots, kpi_slug = 'meta_gestor', valor_texto com o nome
completo do supervisor).

ATENÇÃO — os dados de meta_gestor estão inconsistentes:
- Mesmo gestor aparece em UPPERCASE, Title Case e casing misto.
- Há nomes truncados de uploads antigos (ex: "ANA ANGELICA MATTOS" sem
  "GONCALVES"; "GABRIEL HENRIQUE XIMENES" sem "DA SILVA").
- Há lixo de upload (cabeçalhos colados por engano) — ignorável.

Estratégia de matching (robusta a tudo isso):
- Usar as 2 PRIMEIRAS PALAVRAS do full_name do gestor como filtro ILIKE.
  Ex: gestor "Ana Angelica Mattos Goncalves" → filtro ILIKE '%ANA ANGELICA%'.
- Isso pega todos os formatos de caixa E os nomes truncados, com risco de
  colisão zero (os nomes distintos no banco não colidem nas 2 primeiras
  palavras).

Query base:
.from("kpi_monthly_snapshots")

.select("operator_email")

.eq("mes_ref", mesRef)

.eq("kpi_slug", "meta_gestor")

.ilike("valor_texto", "%ANA ANGELICA%")

(As 2 primeiras palavras vêm do full_name do profile do gestor logado,
uppercased.)

## Mês atual / passado

- Padrão: mês atual (getCurrentMesRef()).
- Toggle na própria página alterna pra mês passado (getPreviousMonthRef()).
- Mês passado: exibido em modo NEUTRO (sem cores de status), igual ao padrão
  das páginas de KPI passado existentes (NeutralKpiValue).
- O toggle é in-page (não rota separada) — diferente das páginas de KPI atuais
  que são 4 rotas. Aqui é uma página só com toggle.

## Estrutura da página

### Toggle de mês (topo)
- "Mês atual" | "Mês passado" — alterna a fonte de dados e o modo de cor.

### Lista de operadores (KPIs principais)
- Uma linha/card por operador da equipe.
- Mostra os 7 indicadores PRINCIPAIS (group_type = 'principal'):
  tx_retencao_bruta, pedidos, churn, variacao_ticket, tma, abs, indisp_total.
- Cada indicador com seu valor formatado e cor de status (mês atual) ou neutro
  (mês passado).
- Nome do operador derivado do email (deriveNomeOperador, já existe).
- Clicável: clicar no operador abre o detalhe (secundários).

Formato da lista: avaliar na implementação entre tabela (densa, vários
operadores) ou cards. Como há muitos KPIs por operador (7 principais),
provavelmente uma TABELA com operador nas linhas e KPIs nas colunas, com cor
por célula. Ou cards expansíveis. Decidir priorizando legibilidade com ~18
operadores × 7 KPIs.

### Detalhe do operador (KPIs secundários)
- Ao clicar num operador, abre o detalhe com os 9 indicadores SECUNDÁRIOS
  (group_type = 'secundario'): tx_retencao_liquida_15d, atendidas, transfer,
  short_call, rechamada_d7, csat, nr17, pessoal, outras_pausas.
- Com valores formatados e cores de status conforme as metas dos secundários.
- Formato do detalhe: avaliar modal, expandir a linha, ou painel lateral.
  Recomendado: expandir a linha ou um modal com os cards secundários
  (reusando KpiMediumCard).

## Definições, metas e cores (reuso)

Tudo já existe — reaproveitar:
- kpi_definitions (group_type principal/secundário, display_name, coloring,
  direction, thresholds).
- Lógica de status (enrich-with-definitions): three_tier, binary, per_row, none.
- getStatusColor(status) → cores do tema.
- formatKpiValue(valor, valueType) → formatação (percent, time, number).
- Componentes: KpiMediumCard (card de indicador com cor/meta),
  TxRetencaoHeroCard (se quiser destacar a TX), formatadores.

Metas (já configuradas no banco):
- Principais: tx_retencao_bruta (three_tier red=60/yellow=69), indisp_total
  (binary <14.5), abs (binary <5), tma (binary <731s), pedidos/churn (per_row
  vs forecast individual), variacao_ticket (informativo).
- Secundários: transfer (<3%), short_call (<2%), rechamada_d7 (<19%), nr17
  (<10.5%), tx_retencao_liquida_15d (lógica de diff), demais informativos.

## Camada de dados (o que criar)

Não existe função pra listar operadores por gestor — criar:

- getOperadoresDoGestor(fullName, mesRef): retorna os operator_email cujo
  meta_gestor casa com o gestor (ILIKE 2 primeiras palavras). 
- getKpiEquipeGestor(fullName, mesRef, grupo): pega os emails do gestor e busca
  os KPIs (principais ou secundários) de cada um em batch. Reusar
  resolveKpiEmailsForProfiles pro alias de email, e a leitura existente
  (getCurrentMonthSnapshot / getCurrentMonthSecundario / getPreviousMonthSnapshot)
  ou uma query batch equivalente.

Avaliar performance: ~18 operadores × buscar KPIs. Preferir uma query batch
(buscar todos os snapshots dos emails da equipe de uma vez) em vez de N queries
individuais. Atenção ao teto de 1000 linhas do PostgREST: 18 operadores × 22
slugs × 1 mês = ~400 linhas, dentro do teto. Mas filtrar por mes_ref + 
operator_email IN (...) pra garantir.

## Permissões

- Role GESTOR vê /operacional/kpi (gate por role, mesmo padrão dos outros
  painéis do gestor).
- O grupo "Operacional > KPI" na sidebar só aparece pra GESTOR.

## Decisões técnicas

- Matching por 2 primeiras palavras do full_name (ILIKE) — robusto a casing e
  truncamento dos dados de meta_gestor.
- Reaproveita 100% do sistema de KPI (definições, metas, cores, componentes,
  formatadores) — esta feature é uma VISÃO nova (filtrada por equipe) sobre
  dados e lógica existentes.
- Toggle mês in-page (não 4 rotas como o KPI individual).
- Mês passado em modo neutro (sem cores), como o padrão existente.

## Evolução futura (fora do escopo)

- Evolução dos KPIs dos operadores (3 meses) — mencionado antes, documento próprio.
- KPI consolidado do gestor (a equipe como um todo, com metas de equipe).
- Vínculo dinâmico + override (o matching atual é por nome; quando o operador
  troca de gestor no KPI, ele migra automaticamente — o que é o comportamento
  desejado).

## Versão

1.0 — KPI da equipe pro gestor (lista de principais + detalhe de secundários,
toggle de mês), grupo Operacional na sidebar.