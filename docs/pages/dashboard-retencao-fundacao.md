# Dashboard de Retenção — Fase 1: Fundação (importar base para o banco)

## Visão geral

Primeira fase do dashboard analítico de retenção. Ao enviar a base (CSV de
atendimentos de retenção), além do fluxo atual que alimenta o Sheets (D-1), o
sistema parseia o CSV e salva os atendimentos no banco. O dashboard (fase
seguinte) lê desse banco. Robusto: transação, sem duplicar, sobrescreve a base
anterior.

## Escopo desta fase

- Tabela no banco espelhando a base de atendimentos.
- Parse do CSV por NOME de coluna (robusto a ordem/variação).
- Salvar no banco ao enviar a base (adicional ao fluxo atual do Sheets — NÃO
  substitui, NÃO quebra o D-1 existente).
- Sobrescrever: cada envio substitui a base anterior no banco (sem histórico de
  dia por enquanto).

NÃO nesta fase: o dashboard em si (telas, gráficos, evolução) — vem na Fase 2.

## Contexto / decisão

- Estratégia B: o upload continua alimentando o Sheets (D-1 atual intacto) e
  ADICIONALMENTE salva no banco. No futuro (estratégia A), o D-1 migra para o
  banco e o Sheets é desligado — projeto separado.
- Só o D-1 (Consolidado, Tempo Logado, Indisponibilidade) vem do Sheets; KPI e
  RV já são banco.

## A base (colunas)

Cabeçalho da base (cada linha = um atendimento de retenção):
- COD_AIR
- DATA DE CRIAÇÃO (DIA)
- COD_SYDLE
- STATUS_CONTRATO (situação do cliente: ativo, suspenso por débito, em
  tratativa — informativo, NÃO define cancelamento)
- STATUS_RETENÇÃO (perfilação da retenção: troca de plano, argumentação... —
  informativo/analítico)
- STATUS_HORA (timestamp do atendimento, ex: "04/07/2026 10:04" — usado para a
  evolução por hora)
- ULT_EQUIPE_ATENDIMENTO
- MOTIVO
- SUBMOTIVO
- PRIMEIRO_NIVEL
- DATA
- USUÁRIO > NOME
- USUÁRIO > LOGIN (email do operador)
- UNIDADE DE ATENDIMENTO > NOME
- UNIDADE DE ATENDIMENTO > SIGLA
- UNIDADE DE ATENDIMENTO > MARCA ASSOCIADA
- FOI_CANCELAMENTO (Falso = Retido; Verdadeiro = Cancelado — REGRA ÚNICA de
  retido/cancelado)
- CONTRATO > COMPRADOR > NOME

## Regra central (retido/cancelado)

- FOI_CANCELAMENTO = "Falso" → RETIDO
- FOI_CANCELAMENTO = "Verdadeiro" → CANCELADO
- É a única fonte. STATUS_CONTRATO e STATUS_RETENÇÃO NÃO definem cancelamento
  (são dimensões analíticas).

## Tabela no banco

Tabela nova (ex: retencao_atendimentos), uma linha por atendimento:
retencao_atendimentos (
id uuid PK default gen_random_uuid(),
cod_air text,
data_criacao date,
cod_sydle text,
status_contrato text,
status_retencao text,
status_hora timestamptz,       -- parseado de "DD/MM/AAAA HH:MM"
hora_bucket int,               -- hora cheia extraída (0-23) para evolução
ult_equipe text,
motivo text,
submotivo text,
primeiro_nivel text,
data_ref date,
usuario_nome text,
usuario_login text,            -- email do operador
unidade_nome text,
unidade_sigla text,
marca text,
foi_cancelamento boolean,      -- Falso→false (retido), Verdadeiro→true (cancelado)
comprador_nome text,
importado_em timestamptz default now()
)
- Índices: em foi_cancelamento, motivo, marca, ult_equipe, usuario_login,
  hora_bucket, data_ref (para as agregações do dashboard serem rápidas).
- hora_bucket: a hora cheia de status_hora (ex: 10:04 → 10). Pré-calcular na
  importação facilita a evolução por hora.

## Parse do CSV (robusto)

- Ler por NOME de coluna (mapear cabeçalho → campo), NÃO por posição. Assim
  variações de ordem não quebram.
- Normalizar nomes de cabeçalho (trim, maiúsculas, colapsar espaços) para casar
  (ex: "USUÁRIO > LOGIN" com espaços variados).
- Conversões:
  - FOI_CANCELAMENTO: "Verdadeiro"/"True"/"Sim" → true; "Falso"/"False"/"Não" →
    false. Tratar variações de caixa.
  - STATUS_HORA: "DD/MM/AAAA HH:MM" → timestamp. Extrair hora_bucket (a hora).
  - Datas (DATA DE CRIAÇÃO, DATA): "DD/MM/AAAA" → date.
- Linhas inválidas (sem COD_AIR, ou sem os campos essenciais): pular e contar
  (reportar quantas foram ignoradas), sem abortar o lote inteiro.
- ~3000 linhas por base: inserir em lote (batch insert), não linha a linha.

## Fluxo de importação

- No upload da base (o mesmo que hoje alimenta o Sheets):
  1. Mantém o fluxo atual (Sheets / D-1) — SEM mudança.
  2. NOVO: parseia o CSV e salva em retencao_atendimentos.
- Sobrescrever: antes de inserir o novo lote, LIMPAR a tabela (delete all) e
  inserir os novos. Fazer em TRANSAÇÃO (ou de forma que não deixe a tabela
  vazia/meio-preenchida se falhar): idealmente inserir o novo, e só então
  remover o antigo; ou usar uma tabela de staging. Definir na implementação a
  abordagem mais segura (não deixar o dashboard sem dados durante a troca).
- Robustez: se o parse/insert falhar, NÃO afetar o fluxo do Sheets (que já
  rodou). Reportar erro claramente. O Sheets e o banco são independentes.

## Onde o upload acontece

- O supervisor anexa o CSV (upload de arquivo, não colagem de texto).
- Avaliar: é o mesmo componente de upload da BASE-1 atual (que hoje manda pro
  Sheets)? Se sim, adicionar o passo de salvar no banco. Se o formato do arquivo
  que vai pro Sheets for diferente do CSV analítico, tratar (pode ser o mesmo
  CSV — parsear por coluna resolve).
- O parse por nome de coluna garante funcionar mesmo se o CSV tiver colunas a
  mais/menos.

## Robustez (requisito enfatizado)

- Batch insert (~3000 linhas de uma vez).
- Transação/staging para a troca sobrescrita não deixar buraco.
- Parse por nome de coluna (resiliente a ordem).
- Linhas inválidas puladas e contadas, sem abortar tudo.
- Falha no banco não quebra o fluxo do Sheets (independentes).
- Log/retorno com: linhas lidas, inseridas, puladas, erros.

## Camada de dados

- parseBaseRetencao(csvText): lê o CSV, retorna as linhas mapeadas + contadores.
- salvarBaseRetencao(linhas): sobrescreve retencao_atendimentos (transação/
  staging), batch insert.
- Integrar no upload da BASE-1 (passo adicional, após/junto ao envio ao Sheets).

## Decisões técnicas

- Parse por nome de coluna (robusto).
- FOI_CANCELAMENTO como única regra de retido/cancelado.
- hora_bucket pré-calculado para a evolução.
- Sobrescreve (sem histórico de dia — futuro).
- Adicional ao Sheets (não substitui — estratégia B).

## Evolução futura

- Histórico por dia (não sobrescrever; guardar snapshots diários).
- Migração A: D-1 lê do banco, desliga Sheets.

## Versão

1.0 — fundação do dashboard: importar a base de retenção para o banco.