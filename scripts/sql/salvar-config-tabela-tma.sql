-- Salvar "Configurações da Tabela" do TMA (meta + ordenação) sem perder
-- metas de outros KPIs (2026-10-10). JÁ APLICADO no Supabase (migração
-- "salvar_config_tabela_tma", 2026-10-10) — este arquivo é o registro.
-- Testado num bloco revertido: só a chave "tma" muda (as outras ficam
-- iguais), meta null aceita, meta "12:99" e ordem inválida recusadas, e
-- linha nova criada com o DEFAULT completo (24 chaves) + a meta do TMA.
--
-- Antes: saveConfigTabelaTmaAction lia kpi_gestor_metas, trocava a chave
-- "tma" no servidor e regravava o JSON inteiro. Se outra gravação na mesma
-- linha (ex.: metas do /s/kpi/gestor em outra aba) acontecesse entre a
-- leitura e a escrita, ela era sobrescrita. Agora o merge acontece no banco,
-- num UPDATE só (trava a linha): troca SÓ a chave "tma" sobre o valor atual.
--
-- Linha inexistente: INSERT só com gestor_id, pra coluna receber o DEFAULT
-- de kpi_gestor_metas (metas padrão de todos os KPIs) — o upsert antigo
-- gravava um JSON só com "tma" e descartava esse default.
--
-- SECURITY INVOKER + auth.uid(): roda como o gestor logado, sob as policies
-- "config fantasia: insert/update own" (gestor_id = auth.uid()) — não dá
-- acesso a nada que ele já não pudesse fazer direto na tabela.
--
-- Chamada por src/lib/gestor/config-tabela-tma/actions/save-config-tabela-tma-action.ts
-- (a action continua validando antes; a função valida de novo, porque é
-- chamável via /rest/v1/rpc por qualquer authenticated).

create or replace function public.salvar_config_tabela_tma(
  p_meta text,
  p_ordem text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_gestor uuid := auth.uid();
begin
  if v_gestor is null then
    raise exception 'não autenticado';
  end if;

  -- Mesmas regras de metaTmaValida (tma-status-pure.ts) e de
  -- ORDEM_TABELA_TMA_VALUES (config-tabela-tma/types.ts).
  if p_meta is not null and (
    p_meta !~ '^\d{1,3}:[0-5]\d$'
    or split_part(p_meta, ':', 1)::int * 60 + split_part(p_meta, ':', 2)::int = 0
  ) then
    raise exception 'meta inválida';
  end if;
  if p_ordem is null or p_ordem not in ('padrao', 'tma_asc', 'tma_desc', 'qtd_desc', 'qtd_asc') then
    raise exception 'ordenação inválida';
  end if;

  insert into public.gestor_config_fantasia (gestor_id)
  values (v_gestor)
  on conflict (gestor_id) do nothing;

  update public.gestor_config_fantasia
  set
    kpi_gestor_metas = coalesce(kpi_gestor_metas, '{}'::jsonb)
      || jsonb_build_object('tma', jsonb_build_object('meta', p_meta, 'direcao', 'lte')),
    ordem_tabela_tma = p_ordem
  where gestor_id = v_gestor;
end;
$$;

-- Só usuário logado (o gestor, pela action). anon não executa.
revoke execute on function public.salvar_config_tabela_tma(text, text) from public, anon;
grant execute on function public.salvar_config_tabela_tma(text, text) to authenticated;

-- Para desfazer (o código precisa voltar ao upsert antes):
-- drop function public.salvar_config_tabela_tma(text, text);
