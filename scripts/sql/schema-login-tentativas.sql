-- Falhas de login recentes — rate limit server-side (src/lib/auth/login-rate-limit.ts).
-- RLS ligado e sem policies: só a service_role (server actions) acessa.

create table public.login_tentativas (
  id bigint generated always as identity primary key,
  username text not null,
  ip text,
  criado_em timestamptz not null default now()
);
create index login_tentativas_username_idx on public.login_tentativas (username, criado_em desc);
create index login_tentativas_ip_idx on public.login_tentativas (ip, criado_em desc);
alter table public.login_tentativas enable row level security;
revoke all on public.login_tentativas from anon, authenticated;
comment on table public.login_tentativas is 'Falhas de login recentes (rate limit server-side). Só acessada via service_role.';
