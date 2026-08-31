"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "@/lib/d1-db/parse";

type RegistrarExibicaoResult = {
  /** true só na PRIMEIRA vez do gestor no dia civil (America/Sao_Paulo). */
  mostrar: boolean;
};

// Código Postgres de unique_violation — a corrida entre colagens rápidas cai
// aqui e é tratada como "já exibido hoje".
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Marca (uma única vez por gestor por dia civil) que o popup do comparativo
 * foi exibido, e diz se ESTA chamada foi a primeira do dia — ou seja, se o
 * popup deve aparecer agora.
 *
 * Estratégia sem SELECT prévio: tenta INSERT direto em
 * comparativo_popup_exibicoes. A PK composta (gestor_id, data_exibicao)
 * resolve a corrida de múltiplas colagens simultâneas — só o primeiro INSERT
 * vinga; os demais recebem 23505 e retornam `mostrar: false`.
 *
 * Fail-safe: qualquer erro inesperado (rede, RLS, coluna) → `mostrar: false`
 * + log. Nunca lança — o fluxo de geração do report não pode travar por
 * causa do popup.
 */
export async function registrarExibicaoPopupComparativoAction(): Promise<RegistrarExibicaoResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.profile.role !== "GESTOR") {
      return { mostrar: false };
    }

    const admin = createAdminClient();
    const { error } = await admin.from("comparativo_popup_exibicoes").insert({
      gestor_id: user.profile.id,
      data_exibicao: dataRefHojeBR(),
    });

    if (!error) {
      // INSERT vingou → é a primeira vez do gestor hoje.
      return { mostrar: true };
    }

    if (error.code === PG_UNIQUE_VIOLATION) {
      // Já existe linha do dia (outra colagem anterior ou simultânea).
      return { mostrar: false };
    }

    console.error(
      "[registrarExibicaoPopupComparativoAction] erro inesperado ao registrar exibição:",
      error.message,
    );
    return { mostrar: false };
  } catch (err) {
    console.error("[registrarExibicaoPopupComparativoAction] exceção:", err);
    return { mostrar: false };
  }
}
