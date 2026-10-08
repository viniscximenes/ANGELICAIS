-- Upload e limpeza da base de Tempo Logado & Indisponibilidade numa
-- transação só (2026-10-08). Mesmo padrão de upload-consolidado-atomico.sql.
-- JÁ APLICADO no Supabase (migração "upload_tempo_logado_atomico", 2026-10-08)
-- — este arquivo é o registro. Testado antes de trocar o código (upsert,
-- atualização por ON CONFLICT, report_datas_base como array e limpeza),
-- dentro de um bloco revertido, sem deixar linhas.
--
-- Atualizado em 2026-10-08 (migração
-- "substituir_base_tempo_logado_remove_ausentes"), também testado num bloco
-- revertido: a função recusa lote vazio e, depois dos upserts, remove do dia
-- quem não veio no lote (mesma regra de substituir_base_consolidado).
-- Consequência aceita: cada upload é a base COMPLETA do dia — um CSV só com
-- uma equipe apaga as linhas de hoje das outras.
--
-- Atualizado em 2026-10-08 (migração "d1_indisponibilidade_pausa_operacional"):
-- coluna nova d1_indisponibilidade.pausa_operacional (text, como as outras
-- pausas) e a função passou a gravá-la. Categoria "Outras Pausas": soma no
-- tempo indisponível / Indisp. % (reason-codes-indisp.ts). Testada num bloco
-- revertido. SQL da coluna:
--   alter table public.d1_indisponibilidade add column if not exists pausa_operacional text;
--
-- Antes: d1_tempo_logado e d1_indisponibilidade eram gravadas (e apagadas)
-- em requests separados — falha no meio = tabela com uma base e o
-- Analítico (pausas/aderência) com outra. Dois uploads (ou upload + "Limpar
-- Base") ao mesmo tempo também podiam se misturar. Agora as duas funções
-- rodam numa transação e pegam o mesmo advisory lock: um segundo upload (ou
-- "Limpar Base") espera o primeiro terminar.
--
-- Remove do dia quem não veio no lote (ver nota de atualização acima).
--
-- Chamadas pelo servidor (service_role) em:
--   src/lib/d1-db/actions/upload-tempo-logado-action.ts → substituir_base_tempo_logado
--   src/lib/d1-db/actions/clear-tempo-logado-action.ts  → limpar_base_tempo_logado

create or replace function public.substituir_base_tempo_logado(
  p_tempo_logado jsonb,
  p_indisponibilidade jsonb,
  p_data_ref date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('base_tempo_logado'));

  -- Lote sem nenhum operador mapeado: com a remoção de ausentes abaixo,
  -- apagaria o dia inteiro. Recusa (a action também barra antes de chamar).
  if p_tempo_logado is null or jsonb_array_length(p_tempo_logado) = 0 then
    raise exception 'p_tempo_logado vazio: nenhum operador mapeado a gestor';
  end if;

  insert into public.d1_tempo_logado (
    data_ref, gestor_id, operator_email, operator_name,
    tempo_logado, tempo_restante, logout_estimado, hora_login, hora_logout,
    report_hora, report_nome_supervisor, report_datas_base
  )
  select
    p_data_ref, t.gestor_id, t.operator_email, t.operator_name,
    t.tempo_logado, t.tempo_restante, t.logout_estimado, t.hora_login, t.hora_logout,
    t.report_hora, t.report_nome_supervisor, t.report_datas_base
  from jsonb_populate_recordset(null::public.d1_tempo_logado, p_tempo_logado) t
  on conflict (data_ref, operator_email) do update set
    gestor_id = excluded.gestor_id,
    operator_name = excluded.operator_name,
    tempo_logado = excluded.tempo_logado,
    tempo_restante = excluded.tempo_restante,
    logout_estimado = excluded.logout_estimado,
    hora_login = excluded.hora_login,
    hora_logout = excluded.hora_logout,
    report_hora = excluded.report_hora,
    report_nome_supervisor = excluded.report_nome_supervisor,
    report_datas_base = excluded.report_datas_base,
    updated_at = now();

  insert into public.d1_indisponibilidade (
    data_ref, gestor_id, operator_email, operator_name,
    indisp_percent, tempo_indisponivel,
    pausa10, pausa20, pausa_particular, pausa_treinamento, pausa_feedback,
    pausa_pre_pausa, pausa_ativo, pausa_take_blip, pausa_email,
    pausa_indisponivel, pausa_sistema, pausa_mon_taref, pausa_operacional,
    pausa10_1_hora_inicio, pausa10_2_hora_inicio, pausa20_hora_inicio,
    report_hora, report_nome_supervisor
  )
  select
    p_data_ref, i.gestor_id, i.operator_email, i.operator_name,
    i.indisp_percent, i.tempo_indisponivel,
    i.pausa10, i.pausa20, i.pausa_particular, i.pausa_treinamento, i.pausa_feedback,
    i.pausa_pre_pausa, i.pausa_ativo, i.pausa_take_blip, i.pausa_email,
    i.pausa_indisponivel, i.pausa_sistema, i.pausa_mon_taref, i.pausa_operacional,
    i.pausa10_1_hora_inicio, i.pausa10_2_hora_inicio, i.pausa20_hora_inicio,
    i.report_hora, i.report_nome_supervisor
  from jsonb_populate_recordset(null::public.d1_indisponibilidade, p_indisponibilidade) i
  on conflict (data_ref, operator_email) do update set
    gestor_id = excluded.gestor_id,
    operator_name = excluded.operator_name,
    indisp_percent = excluded.indisp_percent,
    tempo_indisponivel = excluded.tempo_indisponivel,
    pausa10 = excluded.pausa10,
    pausa20 = excluded.pausa20,
    pausa_particular = excluded.pausa_particular,
    pausa_treinamento = excluded.pausa_treinamento,
    pausa_feedback = excluded.pausa_feedback,
    pausa_pre_pausa = excluded.pausa_pre_pausa,
    pausa_ativo = excluded.pausa_ativo,
    pausa_take_blip = excluded.pausa_take_blip,
    pausa_email = excluded.pausa_email,
    pausa_indisponivel = excluded.pausa_indisponivel,
    pausa_sistema = excluded.pausa_sistema,
    pausa_mon_taref = excluded.pausa_mon_taref,
    pausa_operacional = excluded.pausa_operacional,
    pausa10_1_hora_inicio = excluded.pausa10_1_hora_inicio,
    pausa10_2_hora_inicio = excluded.pausa10_2_hora_inicio,
    pausa20_hora_inicio = excluded.pausa20_hora_inicio,
    report_hora = excluded.report_hora,
    report_nome_supervisor = excluded.report_nome_supervisor,
    updated_at = now();

  -- Operador que tinha linha no dia mas não veio neste upload sai
  -- (mesma regra de substituir_base_consolidado).
  delete from public.d1_tempo_logado d
  where d.data_ref = p_data_ref
    and not exists (
      select 1
      from jsonb_populate_recordset(null::public.d1_tempo_logado, p_tempo_logado) t
      where t.operator_email = d.operator_email
    );

  delete from public.d1_indisponibilidade d
  where d.data_ref = p_data_ref
    and not exists (
      select 1
      from jsonb_populate_recordset(null::public.d1_indisponibilidade, p_indisponibilidade) i
      where i.operator_email = d.operator_email
    );
end;
$$;

create or replace function public.limpar_base_tempo_logado(p_data_ref date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('base_tempo_logado'));
  delete from public.d1_tempo_logado where data_ref = p_data_ref;
  delete from public.d1_indisponibilidade where data_ref = p_data_ref;
end;
$$;

-- Só o servidor (service_role) chama. authenticated/anon não executam.
revoke execute on function public.substituir_base_tempo_logado(jsonb, jsonb, date) from public, anon, authenticated;
revoke execute on function public.limpar_base_tempo_logado(date) from public, anon, authenticated;
grant execute on function public.substituir_base_tempo_logado(jsonb, jsonb, date) to service_role;
grant execute on function public.limpar_base_tempo_logado(date) to service_role;

-- Para desfazer (o código precisa voltar a gravar pelas tabelas antes):
-- drop function public.substituir_base_tempo_logado(jsonb, jsonb, date);
-- drop function public.limpar_base_tempo_logado(date);
