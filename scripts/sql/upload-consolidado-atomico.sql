-- Upload e limpeza da base do Consolidado numa transação só (2026-10-07).
-- JÁ APLICADO no Supabase (migração "upload_consolidado_atomico") — este
-- arquivo é o registro. A recusa de p_consolidado vazio foi aplicada em
-- 2026-10-07 (migração "substituir_base_consolidado_recusa_lote_vazio");
-- antes o ramo vazio pulava d1_consolidado e trocava só o Analítico.
--
-- Antes: retencao_atendimentos e d1_consolidado eram gravadas em requests
-- separados (falha no meio = tabela e Analítico com bases diferentes) e dois
-- uploads ao mesmo tempo se apagavam parcialmente. Agora as duas funções
-- rodam numa transação e pegam o mesmo advisory lock: um segundo upload (ou
-- "Limpar Base") espera o primeiro terminar.
--
-- `where true` nos DELETEs: o safeupdate (carregado nas sessões da API)
-- recusa DELETE sem WHERE.
--
-- Chamadas pelo servidor (service_role) em:
--   src/lib/d1-db/actions/upload-consolidado-action.ts → substituir_base_consolidado
--   src/lib/d1-db/actions/clear-consolidado-action.ts  → limpar_base_consolidado

create or replace function public.substituir_base_consolidado(
  p_atendimentos jsonb,
  p_consolidado jsonb,
  p_data_ref date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_linhas integer;
begin
  perform pg_advisory_xact_lock(hashtext('base_consolidado'));

  -- Lote sem nenhum operador mapeado: trocar só retencao_atendimentos deixaria
  -- o d1_consolidado anterior convivendo com outro lote analítico. Recusa
  -- tudo (auditoria 2026-10-07; a action também barra antes de chamar).
  if p_consolidado is null or jsonb_array_length(p_consolidado) = 0 then
    raise exception 'p_consolidado vazio: nenhum operador mapeado a gestor';
  end if;

  -- retencao_atendimentos guarda só o último lote: troca o conteúdo inteiro.
  delete from public.retencao_atendimentos where true;

  insert into public.retencao_atendimentos (
    cod_air, data_criacao, cod_sydle, status_contrato, status_retencao,
    status_hora, hora_bucket, ult_equipe, motivo, submotivo, primeiro_nivel,
    data_ref, usuario_nome, usuario_login, unidade_nome, unidade_sigla, marca,
    foi_cancelamento, comprador_nome, importado_em
  )
  select
    a.cod_air, a.data_criacao, a.cod_sydle, a.status_contrato, a.status_retencao,
    a.status_hora, a.hora_bucket, a.ult_equipe, a.motivo, a.submotivo, a.primeiro_nivel,
    a.data_ref, a.usuario_nome, a.usuario_login, a.unidade_nome, a.unidade_sigla, a.marca,
    a.foi_cancelamento, a.comprador_nome, now()
  from jsonb_populate_recordset(null::public.retencao_atendimentos, p_atendimentos) a;

  get diagnostics v_linhas = row_count;

  insert into public.d1_consolidado (
    data_ref, gestor_id, operator_email, operator_name, supervisor,
    retidos, cancelados, pedidos, tx_retencao,
    motivos_retidos, motivos_cancelados, contratos_retidos, contratos_cancelados,
    report_hora, report_nome_supervisor, report_datas_base
  )
  select
    p_data_ref, c.gestor_id, c.operator_email, c.operator_name, c.supervisor,
    c.retidos, c.cancelados, c.pedidos, c.tx_retencao,
    c.motivos_retidos, c.motivos_cancelados, c.contratos_retidos, c.contratos_cancelados,
    c.report_hora, c.report_nome_supervisor, c.report_datas_base
  from jsonb_populate_recordset(null::public.d1_consolidado, p_consolidado) c
  on conflict (data_ref, operator_email) do update set
    gestor_id = excluded.gestor_id,
    operator_name = excluded.operator_name,
    supervisor = excluded.supervisor,
    retidos = excluded.retidos,
    cancelados = excluded.cancelados,
    pedidos = excluded.pedidos,
    tx_retencao = excluded.tx_retencao,
    motivos_retidos = excluded.motivos_retidos,
    motivos_cancelados = excluded.motivos_cancelados,
    contratos_retidos = excluded.contratos_retidos,
    contratos_cancelados = excluded.contratos_cancelados,
    report_hora = excluded.report_hora,
    report_nome_supervisor = excluded.report_nome_supervisor,
    report_datas_base = excluded.report_datas_base,
    updated_at = now();

  -- Operador que tinha linha no dia mas não veio neste upload sai.
  delete from public.d1_consolidado d
  where d.data_ref = p_data_ref
    and not exists (
      select 1
      from jsonb_populate_recordset(null::public.d1_consolidado, p_consolidado) c
      where c.operator_email = d.operator_email
    );

  return v_linhas;
end;
$$;

create or replace function public.limpar_base_consolidado(p_data_ref date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('base_consolidado'));
  delete from public.d1_consolidado where data_ref = p_data_ref;
  delete from public.retencao_atendimentos where true;
end;
$$;

-- Só o servidor (service_role) chama. authenticated/anon não executam.
revoke execute on function public.substituir_base_consolidado(jsonb, jsonb, date) from public, anon, authenticated;
revoke execute on function public.limpar_base_consolidado(date) from public, anon, authenticated;
grant execute on function public.substituir_base_consolidado(jsonb, jsonb, date) to service_role;
grant execute on function public.limpar_base_consolidado(date) to service_role;

-- Para desfazer (o código precisa voltar a gravar pelas tabelas antes):
-- drop function public.substituir_base_consolidado(jsonb, jsonb, date);
-- drop function public.limpar_base_consolidado(date);
