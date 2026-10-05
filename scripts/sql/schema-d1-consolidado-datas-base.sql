-- Dias da base colada no upload do Consolidado (/s/reports/consolidado).
--
-- O cabeçalho mostra "Fulano fez um report às 20:25 (base do dia 03/10)" ou,
-- com mais de um dia, "(bases do dia 02/10 - 03/10)": um gestor pode colar a
-- base de outra data e, como a atualização vale pra todos, isso precisa
-- ficar visível. Gravado pelo upload-consolidado-action (dias distintos de
-- status_hora no fuso de Brasília, YYYY-MM-DD, em ordem), igual em todas as
-- linhas do mesmo upload — mesmo padrão de report_hora/report_nome_supervisor.
--
-- Opcional: linhas antigas ficam null e o cabeçalho só omite os dias.
-- Projeto: ahvjrtwgsrggzidrrimv (ANGELICAIS).

alter table d1_consolidado
  add column if not exists report_datas_base text[];
