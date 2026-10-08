-- Fecha a leitura DIRETA (API REST com o token do usuário logado) das bases
-- de Tempo Logado & Indisponibilidade (2026-10-08).
-- JÁ APLICADO no Supabase (migração "fecha_select_aberto_d1_tempo_logado_indisp")
-- — este arquivo é o registro. Mesmo padrão de fecha-select-bases-consolidado.sql.
--
-- Antes: policy "auth select" com USING (true) pra qualquer `authenticated`
-- — qualquer usuário logado lia nome, e-mail, horários e pausas de TODAS as
-- equipes usando a anon key pública + o próprio token de sessão.
--
-- O app só lê estas tabelas pelo client admin (service_role, ignora RLS) —
-- conferido no código: get-gestor-tempo-logado.ts, get-gestor-indisponibilidade.ts,
-- get-coordenador-consolidado.ts, upload/clear-tempo-logado-action.ts e
-- delete-user-action.ts usam createAdminClient(). RLS continua ligada; sem
-- policy = sem acesso.

begin;

drop policy if exists "auth select" on public.d1_tempo_logado;
drop policy if exists "auth select" on public.d1_indisponibilidade;

commit;

-- Para desfazer:
-- create policy "auth select" on public.d1_tempo_logado for select to authenticated using (true);
-- create policy "auth select" on public.d1_indisponibilidade for select to authenticated using (true);
