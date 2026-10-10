"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type TmaRosterRow = { operadorEmail: string };

/** Teto de partes locais distintas por consulta — o polo inteiro tem ~140 operadores cadastrados. */
const MAX_PARTES_LOCAIS = 5_000;

/** Parte local de e-mail (antes do @), já em minúsculas — como parse-tma.ts extrai do CALLED PARTY. */
const PARTE_LOCAL_RE = /^[^\s@]{1,64}$/;

/**
 * Operadores cadastrados (d1_operadores_gestor, todas as equipes — a base do
 * TMA é compartilhada: um CSV do polo atualiza todo mundo) cuja parte local
 * do e-mail aparece no CSV que está sendo enviado. Usado pelo client pra
 * fazer o matching por parte local ANTES de subir os atendimentos (ver
 * parse-tma-client.ts).
 *
 * Só devolve quem está no arquivo, e só o e-mail: antes devolvia o roster
 * GLOBAL inteiro (e-mail + gestor_id de todas as equipes) pra qualquer um com
 * manage_d1_base. O gestor_id não sai mais daqui — uploadTmaAction o resolve
 * no servidor.
 */
export async function getTmaRosterAction(
  partesLocais: string[],
): Promise<{ success: true; roster: TmaRosterRow[] } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_d1_base")) {
    return { success: false, error: "Sem permissão para atualizar a base" };
  }

  // Server Action é um endpoint público: o tipo do TS não chega em runtime.
  if (
    !Array.isArray(partesLocais) ||
    partesLocais.length > MAX_PARTES_LOCAIS ||
    !partesLocais.every((p) => typeof p === "string" && PARTE_LOCAL_RE.test(p))
  ) {
    return { success: false, error: "Dados do arquivo inválidos. Recarregue a página e tente de novo." };
  }

  const pedidas = new Set(partesLocais);
  if (pedidas.size === 0) return { success: true, roster: [] };

  // Filtro em memória: o roster tem ~140 linhas e não há coluna de parte
  // local pra filtrar no banco.
  const admin = createAdminClient();
  const { data, error } = await admin.from("d1_operadores_gestor").select("operador_email");
  if (error) {
    console.error("[get-tma-roster] erro ao buscar roster:", error.message);
    return { success: false, error: "Erro ao buscar roster de operadores." };
  }

  const roster: TmaRosterRow[] = [];
  for (const r of data ?? []) {
    if (!r.operador_email) continue;
    const email = r.operador_email.trim().toLowerCase();
    if (pedidas.has(email.split("@")[0])) roster.push({ operadorEmail: email });
  }

  return { success: true, roster };
}
