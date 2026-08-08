"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { aplicarRegrasDetecao } from "@/lib/db/detectar-registros";
import {
  buscarLinhasDoDiaDaEquipe,
  getRosterPrefixos,
} from "@/lib/db/registros-equipe";
import type { AgenteRegistros } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Roda o motor de detecção sobre o dia selecionado, restrito aos agentes
 * cadastrados na equipe do gestor logado (d1_operadores_gestor), e junta
 * com o que já foi finalizado (db_registros_finalizados) pra marcar cada
 * registro como pendente ou já processado — chave de dedup: agente + tipo
 * + reason_code.
 */
export async function getRegistrosDiaAction(
  dataRef: string,
): Promise<AgenteRegistros[]> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return [];

  const rosterPrefixos = await getRosterPrefixos(user.profile.id);
  if (rosterPrefixos.length === 0) return [];

  const linhas = await buscarLinhasDoDiaDaEquipe(dataRef, rosterPrefixos);
  const registros = aplicarRegrasDetecao(dataRef, linhas);
  if (registros.length === 0) return [];

  const supabase = createAdminClient();
  const { data: finalizadosData, error } = await supabase
    .from("db_registros_finalizados")
    .select("agente_username, tipo, reason_code, tema_nome, texto_gerado")
    .eq("data_ref", dataRef)
    .in("agente_username", rosterPrefixos);

  if (error) {
    console.error("[get-registros-dia] erro ao ler finalizados:", error.message);
  }

  const finalizadosMap = new Map<
    string,
    { temaNome: string; textoGerado: string }
  >();
  for (const row of finalizadosData ?? []) {
    const key = `${row.agente_username}|${row.tipo}|${row.reason_code ?? ""}`;
    finalizadosMap.set(key, {
      temaNome: row.tema_nome,
      textoGerado: row.texto_gerado,
    });
  }

  const porAgente = new Map<string, AgenteRegistros>();
  for (const r of registros) {
    let agente = porAgente.get(r.agent_user);
    if (!agente) {
      agente = { agentUser: r.agent_user, agentName: r.agent_name, registros: [] };
      porAgente.set(r.agent_user, agente);
    }

    const key = `${r.agent_user}|${r.tipo}|${r.reason_code ?? ""}`;
    const finalizado = finalizadosMap.get(key);

    agente.registros.push({
      ...r,
      finalizado: !!finalizado,
      temaNome: finalizado?.temaNome ?? null,
      textoGerado: finalizado?.textoGerado ?? null,
    });
  }

  return Array.from(porAgente.values()).sort((a, b) =>
    a.agentUser.localeCompare(b.agentUser),
  );
}
