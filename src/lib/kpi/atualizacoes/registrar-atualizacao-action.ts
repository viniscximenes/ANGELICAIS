"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Registra uma nova atualização da base de KPI de OPERADORES — chamada pelo
 * formulário da aba "Operadores" de /bases/kpi após um snapshot salvo com
 * sucesso. Cada linha em kpi_operadores_atualizacoes gera um aviso
 * "KPI atualizado até o dia X" que todos os gestores precisam ver uma vez.
 *
 * NÃO deve ser chamada pela aba "Gestores" (GestorSnapshotForm).
 *
 * Dedupe: se a atualização mais recente já é da mesma data_referencia, não
 * insere de novo — reenviar a base do mesmo dia (ex.: correção de mapeamento
 * de header) não redispara o aviso para quem já viu. Uma data de corte nova
 * gera um aviso novo.
 *
 * Fail-safe: qualquer erro é logado e engolido. O fluxo de salvar o snapshot
 * nunca pode travar por causa do aviso.
 */
export async function registrarKpiOperadoresAtualizacaoAction(
  dataReferencia: string,
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
      return;
    }
    if (!DATA_ISO.test(dataReferencia)) {
      console.error(
        "[registrarKpiOperadoresAtualizacaoAction] data_referencia inválida:",
        dataReferencia,
      );
      return;
    }

    const admin = createAdminClient();

    const { data: ultima } = await admin
      .from("kpi_operadores_atualizacoes")
      .select("data_referencia")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultima?.data_referencia === dataReferencia) {
      // Mesma data de corte da última atualização — não redispara.
      return;
    }

    const { error } = await admin.from("kpi_operadores_atualizacoes").insert({
      data_referencia: dataReferencia,
      criado_por: user.profile.id,
    });

    if (error) {
      console.error(
        "[registrarKpiOperadoresAtualizacaoAction] erro ao inserir:",
        error.message,
      );
    }
  } catch (err) {
    console.error("[registrarKpiOperadoresAtualizacaoAction] exceção:", err);
  }
}
