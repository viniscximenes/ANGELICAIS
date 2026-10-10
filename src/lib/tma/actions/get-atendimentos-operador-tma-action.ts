"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getGestorTmaAtendimentos, type AtendimentoTma } from "../get-gestor-tma-atendimentos";

type AtendimentosOperadorResult = { success: true; atendimentos: AtendimentoTma[] } | { success: false };

/**
 * Atendimentos do dia de um operador — chamada pelo modal de detalhamento
 * (TmaTable) ao abrir. Server Action é um endpoint público: o e-mail é
 * validado aqui e a consulta filtra pelo gestor logado, então um e-mail de
 * outra equipe só devolve lista vazia.
 */
export async function getAtendimentosOperadorTmaAction(operatorEmail: string): Promise<AtendimentosOperadorResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return { success: false };

  if (typeof operatorEmail !== "string" || operatorEmail.length > 254 || operatorEmail.indexOf("@") <= 0) {
    return { success: false };
  }

  const atendimentos = await getGestorTmaAtendimentos(user.profile.id, operatorEmail.trim().toLowerCase());
  if (atendimentos === null) return { success: false };
  return { success: true, atendimentos };
}
