-- Popup "ver comparativo" (/reports/consolidado -> /operacao/comparativo-consolidado).
--
-- Registra que o popup do comparativo já foi mostrado a um gestor num dia
-- civil (America/Sao_Paulo — mesma timezone de dataRefHojeBR em
-- src/lib/d1-db/parse.ts). A PK composta (gestor_id, data_exibicao) garante
-- 1 linha por gestor por dia; a aplicação faz INSERT e trata o erro de PK
-- duplicada (23505) como "já exibido hoje", sem precisar de SELECT prévio.
--
-- IMPORTANTE: rodar no projeto Supabase REAL usado pelo app — confirme o
-- host antes (NEXT_PUBLIC_SUPABASE_URL em .env.local). Rodar uma vez no SQL
-- Editor do Supabase (dashboard do projeto CERTO).

create table if not exists comparativo_popup_exibicoes (
  gestor_id uuid not null references profiles(id) on delete cascade,
  data_exibicao date not null,
  exibido_em timestamptz not null default now(),
  primary key (gestor_id, data_exibicao)
);

alter table comparativo_popup_exibicoes enable row level security;
-- Sem policies: só o service role (server actions) acessa — mesma convenção
-- de d1_operadores_gestor, gestor_config_fantasia e db_pausas_diario. O
-- gate por gestor é feito na server action (role === 'GESTOR' + gestor_id =
-- id do usuário logado), não via policy auth.uid().
