-- Leitura de profiles restrita (2026-10-07).
-- JÁ APLICADO no Supabase (migração "profiles_select_proprio_ou_admin") —
-- este arquivo é o registro.
--
-- Antes: "Authenticated users can read profiles" com USING (true) — qualquer
-- usuário logado lia e-mails, nomes e roles da empresa inteira pela API REST.
-- Agora: cada um lê a própria linha; quem administra usuários (mesma regra de
-- can(role, "manage_system", isAdminSkill) no app: ADM, ou GESTOR com
-- is_admin_skill) lê todas — a tela /s/configuracoes/usuarios depende disso.
--
-- Leituras de OUTRAS linhas pela sessão no app: só getAllUsers e a checagem
-- de username em create-user-action (ambas atrás de manage_system).
-- resolveKpiEmailCandidatesForProfiles passou a usar o client admin.
--
-- Testado simulando cada perfil: ADM e GESTOR+admin_skill veem 10/10;
-- GESTOR e COORDENADOR veem só a própria linha; anon vê 0.

-- SECURITY DEFINER: a policy de profiles não pode consultar profiles como o
-- próprio usuário (recursão infinita de RLS).
create or replace function public.pode_ver_todos_profiles()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active is not false
      and (role = 'ADM' or (role = 'GESTOR' and is_admin_skill is true))
  );
$$;

revoke execute on function public.pode_ver_todos_profiles() from public, anon;
grant execute on function public.pode_ver_todos_profiles() to authenticated, service_role;

drop policy if exists "Authenticated users can read profiles" on public.profiles;

create policy "profiles: select proprio ou admin"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.pode_ver_todos_profiles())
  );

-- Para desfazer:
-- drop policy "profiles: select proprio ou admin" on public.profiles;
-- create policy "Authenticated users can read profiles" on public.profiles
--   for select to authenticated using (true);
-- drop function public.pode_ver_todos_profiles();
