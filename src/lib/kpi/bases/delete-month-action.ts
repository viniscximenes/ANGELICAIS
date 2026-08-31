"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import { revalidateKpiSnapshots } from "./revalidate-kpi";

/**
 * Qual base apagar:
 *  - "operadores" → só kpi_monthly_snapshots
 *  - "gestores"   → só kpi_gestor_snapshots
 *  - "ambos"      → as duas (precisa ser pedido explicitamente)
 *
 * O default NÃO é "ambos": o histórico de operadores e o de gestores têm
 * botões de apagar separados, e cada um deve mexer só na sua tabela. Antes
 * a action apagava sempre as duas — foi assim que um "apagar mês" no
 * histórico de gestores levou junto os dados de operadores recém-colados.
 */
export type DeleteScope = "operadores" | "gestores" | "ambos";

type DeleteMonthResult =
  | {
      success: true;
      scope: DeleteScope;
      rowsOperadores: number;
      rowsGestores: number;
      rowsDeleted: number;
    }
  | { success: false; error: string };

export async function deleteMonthAction(
  mesRef: string,
  scope: DeleteScope,
): Promise<DeleteMonthResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão para apagar dados" };
  }

  if (!mesRef.match(/^\d{4}-\d{2}-01$/)) {
    return { success: false, error: "Mês de referência inválido" };
  }

  if (scope !== "operadores" && scope !== "gestores" && scope !== "ambos") {
    return { success: false, error: "Escopo de exclusão inválido" };
  }

  const supabase = createAdminClient();
  const apagaOperadores = scope === "operadores" || scope === "ambos";
  const apagaGestores = scope === "gestores" || scope === "ambos";

  let rowsOperadores = 0;
  let rowsGestores = 0;

  if (apagaOperadores) {
    const { error, count } = await supabase
      .from("kpi_monthly_snapshots")
      .delete({ count: "exact" })
      .eq("mes_ref", mesRef);

    if (error) {
      console.error("[delete-month] erro operadores:", error);
      return { success: false, error: "Falha ao apagar dados de operadores" };
    }
    rowsOperadores = count ?? 0;
  }

  if (apagaGestores) {
    const { error, count } = await supabase
      .from("kpi_gestor_snapshots")
      .delete({ count: "exact" })
      .eq("mes_ref", mesRef);

    if (error) {
      console.error("[delete-month] erro gestores:", error);
      return { success: false, error: "Falha ao apagar dados de gestores" };
    }
    rowsGestores = count ?? 0;
  }

  revalidateKpiSnapshots();

  return {
    success: true,
    scope,
    rowsOperadores,
    rowsGestores,
    rowsDeleted: rowsOperadores + rowsGestores,
  };
}
