"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const LOG = "[registrarKpiOperadoresAtualizacaoAction]";

/**
 * Registra uma nova atualização da base de KPI de OPERADORES — chamada pelo
 * formulário da aba "Operadores" de /bases/kpi em todo snapshot salvo com
 * sucesso. Cada linha em kpi_operadores_atualizacoes gera um aviso
 * "KPI atualizado até o dia X" que todos os gestores precisam ver uma vez.
 *
 * NÃO deve ser chamada pela aba "Gestores" (GestorSnapshotForm).
 *
 * Dedupe: se a atualização mais recente já é da mesma data_referencia, não
 * insere de novo — reenviar/reprocessar a base do mesmo dia (ex.: correção
 * de mapeamento de header) não redispara o aviso. Uma data de corte nova
 * gera um aviso novo.
 *
 * Fail-safe: nunca lança — o fluxo de salvar o snapshot não pode travar por
 * causa do aviso. Mas cada caminho de saída LOGA (console.error/info), pra
 * uma falha nunca voltar a ser invisível.
 */
export async function registrarKpiOperadoresAtualizacaoAction(
  dataReferencia: string,
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error(`${LOG} sem usuário autenticado — nada inserido.`);
      return;
    }

    if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
      console.error(
        `${LOG} usuário ${user.profile.id} (role=${user.profile.role}, ` +
          `adminSkill=${user.profile.isAdminSkill}) sem permissão manage_base — nada inserido.`,
      );
      return;
    }

    if (!DATA_ISO.test(dataReferencia)) {
      console.error(
        `${LOG} data_referencia inválida: ${JSON.stringify(dataReferencia)} — nada inserido.`,
      );
      return;
    }

    const admin = createAdminClient();

    const { data: ultima, error: selError } = await admin
      .from("kpi_operadores_atualizacoes")
      .select("data_referencia")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selError) {
      // Não aborta: sem a última, seguimos sem dedupe e tentamos inserir.
      console.error(
        `${LOG} erro ao ler última atualização (code=${selError.code}): ${selError.message}`,
      );
    }

    if (ultima?.data_referencia === dataReferencia) {
      console.info(
        `${LOG} dedupe — última atualização já é de ${dataReferencia}, nada inserido.`,
      );
      return;
    }

    const { error: insError } = await admin
      .from("kpi_operadores_atualizacoes")
      .insert({
        data_referencia: dataReferencia,
        criado_por: user.profile.id,
      });

    if (insError) {
      console.error(
        `${LOG} falha no INSERT (code=${insError.code}): ${insError.message}` +
          (insError.details ? ` | details: ${insError.details}` : "") +
          (insError.hint ? ` | hint: ${insError.hint}` : ""),
      );
      return;
    }

    console.info(
      `${LOG} atualização registrada (data_referencia=${dataReferencia}, criado_por=${user.profile.id}).`,
    );
  } catch (err) {
    console.error(`${LOG} exceção não tratada:`, err);
  }
}
