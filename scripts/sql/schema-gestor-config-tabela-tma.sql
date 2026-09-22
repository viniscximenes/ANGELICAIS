-- Ordenação customizável da tabela do TMA (/reports/tma): mesma coluna dedicada
-- do padrão de ordem_tabela (consolidado) e ordem_tabela_tempo_indisp
-- (tempo logado & indisponibilidade) — cada tela com ordenação configurável
-- tem SUA PRÓPRIA coluna em gestor_config_fantasia.
--
-- IMPORTANTE: rodar no projeto Supabase REAL usado pelo app — confirme o
-- host antes de rodar (NEXT_PUBLIC_SUPABASE_URL em .env.local).
--
-- Rodar uma vez no SQL Editor do Supabase (dashboard do projeto CERTO).

alter table gestor_config_fantasia
  add column if not exists ordem_tabela_tma text not null default 'padrao';

-- Valores aceitos por ordem_tabela_tma (validados na aplicação, não via CHECK
-- constraint, para não exigir migration toda vez que uma opção nova for
-- adicionada):
--   padrao, tma_asc, tma_desc, qtd_desc, qtd_asc
