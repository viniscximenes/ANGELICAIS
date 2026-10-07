-- Meta padrão de TX Retenção: 60% → 63% (2026-10-07).
-- JÁ APLICADO no Supabase (migração "meta_tx_retencao_padrao_63") — este
-- arquivo é o registro.
--
-- Mesmo valor de DEFAULT_META_TX_RETENCAO (src/lib/gestor/config-tabela/types.ts).
-- Vale só pra linhas NOVAS de gestor_config_fantasia: metas já gravadas não
-- mudam. Sem isto, um gestor que só ligasse o "olho" ou o "Exibir RV" (upsert
-- parcial) ganharia uma linha com meta 60 gravada pelo default do banco.

alter table public.gestor_config_fantasia alter column meta_tx_retencao set default 63;

-- Para desfazer:
-- alter table public.gestor_config_fantasia alter column meta_tx_retencao set default 60;
