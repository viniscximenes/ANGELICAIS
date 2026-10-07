-- Dias da base colada no upload da TMA (/s/reports/tma-peso) e do Tempo
-- Logado & Indisponibilidade (/s/reports/tempo-indisponibilidade).
--
-- Mesma regra de d1_consolidado.report_datas_base: o cabeçalho mostra
-- "Fulano fez um report às 20:25  -   (base do dia 03/10)" ou, com mais de
-- um dia, "(bases do dia 02/10 - 03/10)". Os dias vêm da coluna DATE da
-- própria base (não do dia em que foi colada), distintos, YYYY-MM-DD, em
-- ordem — gravados iguais em todas as linhas do mesmo upload.
--
-- Opcional: linhas antigas ficam null e o cabeçalho só omite os dias.
-- Projeto: ahvjrtwgsrggzidrrimv (ANGELICAIS). Aplicado em 2026-10-07.

alter table d1_tma add column if not exists report_datas_base text[];
alter table d1_tempo_logado add column if not exists report_datas_base text[];
