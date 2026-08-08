"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { ContagemPorDia } from "@/lib/db/detectar-registros";
import {
  contarRegistrosPorDiaDaEquipe,
  getRosterPrefixos,
} from "@/lib/db/registros-equipe";

/**
 * Dias disponíveis pro seletor da página DB do supervisor, com a contagem
 * de registros de atenção detectados em cada um — restrita à equipe do
 * gestor logado (não a empresa toda).
 */
export async function getDiasComRegistrosAction(): Promise<ContagemPorDia[]> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return [];

  try {
    const rosterPrefixos = await getRosterPrefixos(user.profile.id);
    return await contarRegistrosPorDiaDaEquipe(rosterPrefixos);
  } catch (err) {
    console.error("[get-dias-com-registros] erro:", err);
    return [];
  }
}
