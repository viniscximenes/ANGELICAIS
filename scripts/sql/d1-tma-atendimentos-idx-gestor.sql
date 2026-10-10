-- Índice das leituras do TMA por equipe (2026-10-09).
-- JÁ APLICADO no Supabase (migração "d1_tma_atendimentos_idx_gestor") — este
-- arquivo é o registro.
--
-- As leituras de d1_tma_atendimentos filtram por data_ref + gestor_id
-- (src/lib/tma/get-gestor-tma-atendimentos.ts e get-gestor-tma-analitico.ts,
-- via ler-atendimentos-tma.ts). O índice único (data_ref, call_segment_id)
-- só cobria o data_ref.

create index if not exists d1_tma_atendimentos_data_ref_gestor_id_idx
  on public.d1_tma_atendimentos (data_ref, gestor_id);

-- Para desfazer:
-- drop index public.d1_tma_atendimentos_data_ref_gestor_id_idx;
