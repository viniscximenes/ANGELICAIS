-- Metas por tema do Consolidado no banco (2026-10-07).
-- JÁ APLICADO no Supabase (migração "gestor_config_meta_temas") — este
-- arquivo é o registro.
--
-- Antes: só no localStorage do navegador (por gestor), enquanto a meta geral
-- já ia para gestor_config_fantasia.meta_tx_retencao — as metas por tema não
-- acompanhavam o gestor em outro navegador. Gravadas por
-- saveConfigTabelaAction junto com a meta geral; lidas por getConfigTabela.
-- null = nunca salvou: a tela usa o que estiver no navegador (transição) ou
-- o padrão, e grava no banco no próximo "Salvar".

alter table public.gestor_config_fantasia add column if not exists meta_temas jsonb;

comment on column public.gestor_config_fantasia.meta_temas is
  'Metas de TX por tema do Consolidado ({"Mot. Financeiro": 80, ...}, 0-100). null = nunca salvou (vale o padrão).';

-- Para desfazer (o código precisa voltar a ler do localStorage antes):
-- alter table public.gestor_config_fantasia drop column meta_temas;
