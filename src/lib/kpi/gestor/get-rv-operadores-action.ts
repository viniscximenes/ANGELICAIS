"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { getRvParaEquipe, type RvEquipeResultado } from "@/lib/rv/get-rv-para-equipe";
import type { RvScope } from "@/lib/rv/types";

const MES_REF_REGEX = /^\d{4}-\d{2}-01$/;

type GetRvOperadoresResult =
  | { success: true; data: RvEquipeResultado }
  | { success: false; error: string };

/**
 * RV geral (mensal, normal + contestação) da equipe do gestor logado, num
 * mês/scope específico — chamada sob demanda ao ligar "Exibir RV" em
 * /kpi/operadores (ou trocar de mês com o toggle já ligado).
 *
 * A equipe vem do roster do PRÓPRIO gestor (getRosterOperadoresGestor), nunca
 * de uma lista de emails vinda do client — mesma cautela de
 * getKpiMesHistoricoAction.
 */
export async function getRvOperadoresAction(
  mesRef: string,
  scope: RvScope,
): Promise<GetRvOperadoresResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!MES_REF_REGEX.test(mesRef)) {
    return { success: false, error: "Mês inválido" };
  }

  if (scope !== "current" && scope !== "previous") {
    return { success: false, error: "Escopo inválido" };
  }

  const emailsEquipe = await getRosterOperadoresGestor(user.profile.id);
  const data = await getRvParaEquipe(emailsEquipe, mesRef, scope);

  return { success: true, data };
}
