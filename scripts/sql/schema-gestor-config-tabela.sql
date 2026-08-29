-- Configuração da tabela do painel do gestor (/reports/consolidado): meta
-- de TX + ordenação customizável dos operadores.
--
-- IMPORTANTE: rodar no projeto Supabase REAL usado pelo app — confirme o
-- host antes de rodar (NEXT_PUBLIC_SUPABASE_URL em .env.local). Nenhuma
-- das duas colunas existia no projeto real, apesar de meta_tx_retencao já
-- ser referenciada por src/lib/retencao/meta.ts — ou seja, aquela feature
-- também vinha falhando silenciosamente (erro capturado + fallback pro
-- default), não é algo novo desta migration.
--
-- Rodar uma vez no SQL Editor do Supabase (dashboard do projeto CERTO).

alter table gestor_config_fantasia
  add column if not exists meta_tx_retencao numeric not null default 60;

alter table gestor_config_fantasia
  add column if not exists ordem_tabela text not null default 'padrao';

-- Valores aceitos por ordem_tabela (validados na aplicação, não via CHECK
-- constraint, para não exigir migration toda vez que uma opção nova for
-- adicionada):
--   padrao, tx_desc, tx_asc, retidos_desc, retidos_asc, cancelados_desc,
--   pedidos_desc
