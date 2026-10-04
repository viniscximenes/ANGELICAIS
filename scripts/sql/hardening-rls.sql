-- Endurecimento de RLS / permissões (2026-10-04).
--
-- Contexto: o app nunca acessa o banco pelo navegador — toda leitura/escrita
-- passa por server actions, e as escritas nas bases são feitas com o client
-- admin (service_role, que ignora RLS). Então as policies abaixo só servem
-- pra fechar o acesso DIRETO à API REST com o JWT de um usuário logado.

begin;

-- 1) profiles: o usuário só pode alterar a própria preferência de tema.
--    Antes, a policy "Users can update own profile" + grant de UPDATE em todas
--    as colunas permitia a qualquer GESTOR mudar o próprio role pra 'ADM'.
revoke update on public.profiles from authenticated, anon;
grant update (theme_preference, updated_at) on public.profiles to authenticated;
alter policy "Users can update own profile" on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2) Bases compartilhadas: escrita só via service_role (server actions já
--    checam can(...) antes). Remove INSERT/UPDATE/DELETE liberados pra
--    qualquer usuário logado. As policies de SELECT continuam.
drop policy if exists "auth delete" on public.d1_consolidado;
drop policy if exists "auth insert" on public.d1_consolidado;
drop policy if exists "auth update" on public.d1_consolidado;

drop policy if exists "auth delete" on public.d1_indisponibilidade;
drop policy if exists "auth insert" on public.d1_indisponibilidade;
drop policy if exists "auth update" on public.d1_indisponibilidade;

drop policy if exists "auth delete" on public.d1_tempo_logado;
drop policy if exists "auth insert" on public.d1_tempo_logado;
drop policy if exists "auth update" on public.d1_tempo_logado;

drop policy if exists "auth delete" on public.d1_operadores_gestor;
drop policy if exists "auth insert" on public.d1_operadores_gestor;

drop policy if exists "auth delete" on public.equipe_diario_justificativas_padrao;
drop policy if exists "auth insert" on public.equipe_diario_justificativas_padrao;
drop policy if exists "auth update" on public.equipe_diario_justificativas_padrao;

drop policy if exists "kpi_gestor_snapshots: delete authenticated" on public.kpi_gestor_snapshots;
drop policy if exists "kpi_gestor_snapshots: insert authenticated" on public.kpi_gestor_snapshots;
drop policy if exists "kpi_gestor_snapshots: update authenticated" on public.kpi_gestor_snapshots;

drop policy if exists "retencao: delete authenticated" on public.retencao_atendimentos;
drop policy if exists "retencao: insert authenticated" on public.retencao_atendimentos;

-- 3) Funções: search_path fixo (evita sequestro por objeto homônimo) e
--    rls_auto_enable (função de event trigger) fora da API pública.
alter function public.is_adm() set search_path = public, pg_temp;
alter function public.kpi_gestor_set_updated_at() set search_path = public, pg_temp;
alter function public.set_updated_at_fantasia() set search_path = public, pg_temp;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

commit;
