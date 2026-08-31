-- Popup "KPI atualizado até o dia X" para GESTORES.
--
-- Disparado quando um ADM sobe uma base na aba OPERADORES de /bases/kpi
-- (nunca na aba Gestores). Todos os gestores ativos recebem um aviso, uma
-- única vez por atualização — ao vivo (polling no layout autenticado) ou na
-- primeira tela após o próximo login.
--
-- Convenção de RLS (igual a comparativo_popup_exibicoes,
-- d1_operadores_gestor, gestor_config_fantasia, db_pausas_diario): RLS
-- habilitado, ZERO policies. Todo acesso é via service role nas server
-- actions, que fazem o gate por role (ADM sobe; só GESTOR enxerga o popup).
--
-- IMPORTANTE: rodar no projeto Supabase REAL usado pelo app — confirme o
-- host (NEXT_PUBLIC_SUPABASE_URL em .env.local) antes de rodar no SQL
-- Editor do dashboard do projeto certo.

-- Um registro por upload bem-sucedido na aba Operadores de /bases/kpi.
-- data_referencia = "Dados até o dia" escolhido no formulário (data de
-- corte da base). criado_por = profile do ADM que subiu (usado para não
-- mostrar o popup a quem subiu a base, caso seja um GESTOR com is_admin_skill).
create table if not exists public.kpi_operadores_atualizacoes (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);

create index if not exists kpi_operadores_atualizacoes_criado_em_idx
  on public.kpi_operadores_atualizacoes (criado_em desc);

-- Controle de quem (gestor) já viu qual atualização. A PK composta resolve
-- a corrida entre o check "ao vivo" (polling) e o check no login: só o
-- primeiro INSERT vinga; os demais recebem 23505 e são tratados como
-- "já visto".
create table if not exists public.kpi_atualizacao_visualizacoes (
  atualizacao_id uuid not null
    references public.kpi_operadores_atualizacoes(id) on delete cascade,
  gestor_id uuid not null references public.profiles(id) on delete cascade,
  visualizado_em timestamptz not null default now(),
  primary key (atualizacao_id, gestor_id)
);

alter table public.kpi_operadores_atualizacoes enable row level security;
alter table public.kpi_atualizacao_visualizacoes enable row level security;
-- Sem policies: só o service role (server actions) acessa.
