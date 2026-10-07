import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails dos operadores cadastrados na equipe de um gestor
 * (d1_operadores_gestor), normalizados (trim + minúsculas) e ordenados — a
 * lista da EQUIPE em si, independente de já ter dado do dia em
 * d1_consolidado/d1_tempo_logado/d1_indisponibilidade.
 *
 * ÚNICA leitura do roster: getRosterOperadoresGestor (abaixo) e
 * getEmailsEquipe (Analítico) usam esta função, para o topo e o Analítico
 * do Consolidado não divergirem em ordenação/normalização.
 *
 * Erro de banco LANÇA. cache() do React: a mesma requisição consulta o
 * roster uma vez só; fora de uma requisição do React, chama direto.
 */
export const getRosterOperadoresGestorOuErro = cache(async function getRosterOperadoresGestorOuErro(
  gestorId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("d1_operadores_gestor")
    .select("operador_email")
    .eq("gestor_id", gestorId)
    .order("operador_email", { ascending: true });

  if (error) {
    console.error("[get-roster-gestor] erro ao buscar operadores do gestor:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.operador_email.trim().toLowerCase());
});

/**
 * Mesma leitura, mas erro de banco vira [] — contrato de sempre das telas que
 * já usam esta função. "Equipe vazia" (retorno []) e "equipe sem dado do dia"
 * são estados diferentes; só o primeiro deve virar o erro "sem equipe" nas
 * páginas do gestor (getGestorConsolidado confirma o [] com uma contagem).
 */
export const getRosterOperadoresGestor = cache(async function getRosterOperadoresGestor(
  gestorId: string,
): Promise<string[]> {
  try {
    return await getRosterOperadoresGestorOuErro(gestorId);
  } catch {
    return [];
  }
});
