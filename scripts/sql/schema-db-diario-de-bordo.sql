-- Diário de Bordo (DB) — Fatia 1: banco para o CSV de pausas + temas.
-- Ver docs/pages/diario-de-bordo.md.
-- Rodar uma vez no SQL Editor do Supabase (dashboard do projeto).

-- db_pausas_diario: linhas do CSV de login/logout/pausas, guardadas por dia.
-- Um novo upload do mesmo data_ref sobrescreve (delete+insert seguro, ver
-- src/lib/db/salvar-csv-pausas.ts); dias diferentes coexistem.
create table db_pausas_diario (
  id uuid primary key default gen_random_uuid(),
  data_ref date not null,
  agent_user text not null,
  agent_name text not null,
  agent_email text not null,
  state text not null,
  reason_code text,
  login_time_seg integer,
  agent_state_time_seg integer,
  importado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index db_pausas_diario_data_ref_idx on db_pausas_diario (data_ref);
create index db_pausas_diario_data_ref_agent_user_idx on db_pausas_diario (data_ref, agent_user);

alter table db_pausas_diario enable row level security;
-- Sem policies por enquanto: só o service role (server actions) acessa.

-- db_temas: temas configuráveis pelo ADM, usados para gerar o texto final.
create table db_temas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pausa', 'tempo_logado')),
  nome text not null,
  texto_motivo text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index db_temas_tipo_ativo_idx on db_temas (tipo, ativo);

alter table db_temas enable row level security;
-- Sem policies por enquanto: só o service role (server actions) acessa.
