-- Fecha a leitura DIRETA (API REST com o token do usuário logado) das bases
-- do Consolidado (2026-10-07).
--
-- Antes: policies de SELECT com USING (true) pra qualquer `authenticated` —
-- qualquer usuário logado lia a base de TODAS as equipes (inclusive nome do
-- cliente em retencao_atendimentos.comprador_nome e d1_consolidado.contratos_*)
-- usando a anon key pública + o próprio token de sessão.
--
-- O app só lê estas tabelas pelo client admin (service_role, ignora RLS) —
-- conferido no código: nenhum createClient() de sessão lê d1_consolidado,
-- retencao_atendimentos ou d1_operadores_gestor, e não há view/função no
-- banco que dependa delas. RLS continua ligada; sem policy = sem acesso.
--
-- Rodar no SQL Editor do Supabase (projeto ANGELICAIS).

begin;

drop policy if exists "auth select" on public.d1_consolidado;
drop policy if exists "auth select" on public.d1_operadores_gestor;
drop policy if exists "retencao: select authenticated" on public.retencao_atendimentos;

commit;

-- Para desfazer:
-- create policy "auth select" on public.d1_consolidado for select to authenticated using (true);
-- create policy "auth select" on public.d1_operadores_gestor for select to authenticated using (true);
-- create policy "retencao: select authenticated" on public.retencao_atendimentos for select to authenticated using (true);
