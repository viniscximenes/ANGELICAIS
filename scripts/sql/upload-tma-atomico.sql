-- Upload e limpeza da base do TMA & Peso numa transação só (2026-10-09).
-- Mesmo padrão de upload-consolidado-atomico.sql e
-- upload-tempo-logado-atomico.sql. JÁ APLICADO no Supabase (migração
-- "upload_tma_atomico", 2026-10-09) — este arquivo é o registro. Testado
-- num bloco revertido (data 2000-01-01, sem deixar linhas): upsert em
-- d1_tma, troca dos atendimentos, remoção de quem não veio no lote, recusa
-- de lote vazio e limpeza.
--
-- Antes: d1_tma (upsert), d1_tma_atendimentos (delete + upserts em lotes de
-- 2000) eram requests separados — falha no meio deixava tabela e Analítico
-- com bases diferentes (havia 80 linhas de d1_tma sem nenhum atendimento).
-- O "Limpar Base" apagava só a equipe de quem clicou e o upload só
-- substituía as equipes presentes no CSV; quem não vinha ficava com os
-- números antigos.
--
-- Agora a base do dia é ÚNICA/compartilhada, como no Consolidado: o upload
-- substitui o dia inteiro (quem não veio no lote sai das duas tabelas) e o
-- "Limpar Base" apaga o dia de todas as equipes. As duas funções pegam o
-- mesmo advisory lock: um segundo upload (ou "Limpar Base") espera o
-- primeiro terminar. Consequência aceita: um CSV só com uma equipe apaga as
-- linhas de hoje das outras.
--
-- Chamadas pelo servidor (service_role) em:
--   src/lib/tma/actions/upload-tma-action.ts → substituir_base_tma
--   src/lib/tma/actions/clear-tma-action.ts  → limpar_base_tma

create or replace function public.substituir_base_tma(
  p_tma jsonb,
  p_atendimentos jsonb,
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
  perform pg_advisory_xact_lock(hashtext('base_tma'));

  -- Lote sem nenhum operador mapeado: recusa tudo (a action também barra
  -- antes de chamar) — mesma regra de substituir_base_consolidado.
  if p_tma is null or jsonb_array_length(p_tma) = 0 then
    raise exception 'p_tma vazio: nenhum operador mapeado a gestor';
  end if;

  -- Atendimentos: troca o dia inteiro. O call_segment_id do Five9 muda a
  -- cada exportação do mesmo atendimento, então só um delete + insert evita
  -- acumular reenvios.
  delete from public.d1_tma_atendimentos where data_ref = p_data_ref;

  insert into public.d1_tma_atendimentos (
    data_ref, gestor_id, operator_email, call_id, call_segment_id, hora,
    telefone_cliente, skill, duracao_segundos, talk_segundos, acw_segundos
  )
  select
    p_data_ref, a.gestor_id, a.operator_email, a.call_id, a.call_segment_id, a.hora,
    a.telefone_cliente, a.skill, a.duracao_segundos, a.talk_segundos, a.acw_segundos
  from jsonb_populate_recordset(null::public.d1_tma_atendimentos, p_atendimentos) a;

  get diagnostics v_linhas = row_count;

  insert into public.d1_tma (
    data_ref, gestor_id, operator_email, qtd_atendimentos,
    talk_total_segundos, acw_total_segundos, tma_segundos,
    talk_medio_segundos, acw_medio_segundos,
    qtd_outros, qtd_criticos, qtd_mud_endereco, qtd_financeiro,
    qtd_qualidade, qtd_concorrencia, qtd_hotline_churn,
    report_hora, report_nome_supervisor, report_datas_base
  )
  select
    p_data_ref, t.gestor_id, t.operator_email, t.qtd_atendimentos,
    t.talk_total_segundos, t.acw_total_segundos, t.tma_segundos,
    t.talk_medio_segundos, t.acw_medio_segundos,
    t.qtd_outros, t.qtd_criticos, t.qtd_mud_endereco, t.qtd_financeiro,
    t.qtd_qualidade, t.qtd_concorrencia, t.qtd_hotline_churn,
    t.report_hora, t.report_nome_supervisor, t.report_datas_base
  from jsonb_populate_recordset(null::public.d1_tma, p_tma) t
  on conflict (data_ref, operator_email) do update set
    gestor_id = excluded.gestor_id,
    qtd_atendimentos = excluded.qtd_atendimentos,
    talk_total_segundos = excluded.talk_total_segundos,
    acw_total_segundos = excluded.acw_total_segundos,
    tma_segundos = excluded.tma_segundos,
    talk_medio_segundos = excluded.talk_medio_segundos,
    acw_medio_segundos = excluded.acw_medio_segundos,
    qtd_outros = excluded.qtd_outros,
    qtd_criticos = excluded.qtd_criticos,
    qtd_mud_endereco = excluded.qtd_mud_endereco,
    qtd_financeiro = excluded.qtd_financeiro,
    qtd_qualidade = excluded.qtd_qualidade,
    qtd_concorrencia = excluded.qtd_concorrencia,
    qtd_hotline_churn = excluded.qtd_hotline_churn,
    report_hora = excluded.report_hora,
    report_nome_supervisor = excluded.report_nome_supervisor,
    report_datas_base = excluded.report_datas_base,
    updated_at = now();

  -- Operador que tinha linha no dia mas não veio neste upload sai.
  delete from public.d1_tma d
  where d.data_ref = p_data_ref
    and not exists (
      select 1
      from jsonb_populate_recordset(null::public.d1_tma, p_tma) t
      where t.operator_email = d.operator_email
    );

  return v_linhas;
end;
$$;

create or replace function public.limpar_base_tma(p_data_ref date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('base_tma'));
  delete from public.d1_tma where data_ref = p_data_ref;
  delete from public.d1_tma_atendimentos where data_ref = p_data_ref;
end;
$$;

-- Só o servidor (service_role) chama. authenticated/anon não executam.
revoke execute on function public.substituir_base_tma(jsonb, jsonb, date) from public, anon, authenticated;
revoke execute on function public.limpar_base_tma(date) from public, anon, authenticated;
grant execute on function public.substituir_base_tma(jsonb, jsonb, date) to service_role;
grant execute on function public.limpar_base_tma(date) to service_role;

-- Para desfazer (o código precisa voltar a gravar pelas tabelas antes):
-- drop function public.substituir_base_tma(jsonb, jsonb, date);
-- drop function public.limpar_base_tma(date);
