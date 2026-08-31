"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

const PG_UNIQUE_VIOLATION = "23505";

type ChecarResult = {
  /** true só na PRIMEIRA vez que este gestor "vê" a atualização mais recente. */
  mostrar: boolean;
  /** data de corte da base (YYYY-MM-DD) — presente quando mostrar === true. */
  dataReferencia?: string;
};

/**
 * Diz se há uma atualização da base de KPI de operadores que ESTE gestor
 * ainda não viu — e, no mesmo passo, marca como vista (padrão de corrida do
 * popup de comparativo: INSERT direto, 23505 = "já visto").
 *
 * Roda em dois pontos (ver NotificacoesCantoProvider):
 *  - ao montar o layout autenticado do gestor (cobre o caso "estava deslogado");
 *  - em polling leve enquanto o gestor tem alguma aba aberta (cobre "ao vivo").
 *
 * Regras:
 *  - só role === 'GESTOR' (ADM puro nunca vê);
 *  - quem subiu a base (criado_por) não recebe o próprio aviso;
 *  - marcado como visto assim que aparece — não espera o auto-dismiss.
 *
 * Fail-safe: qualquer erro inesperado → { mostrar: false } + log. Nunca lança.
 */
export async function checarKpiAtualizacaoNaoVistaAction(): Promise<ChecarResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.profile.role !== "GESTOR") {
      return { mostrar: false };
    }

    const admin = createAdminClient();

    const { data: atualizacao, error: selError } = await admin
      .from("kpi_operadores_atualizacoes")
      .select("id, data_referencia, criado_por")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selError) {
      console.error(
        "[checarKpiAtualizacaoNaoVistaAction] erro ao buscar atualização:",
        selError.message,
      );
      return { mostrar: false };
    }

    if (!atualizacao) {
      return { mostrar: false };
    }

    // Quem subiu a base não vê o próprio aviso (caso GESTOR com is_admin_skill).
    if (atualizacao.criado_por === user.profile.id) {
      return { mostrar: false };
    }

    const { error: insError } = await admin
      .from("kpi_atualizacao_visualizacoes")
      .insert({
        atualizacao_id: atualizacao.id,
        gestor_id: user.profile.id,
      });

    if (!insError) {
      return { mostrar: true, dataReferencia: atualizacao.data_referencia };
    }

    if (insError.code === PG_UNIQUE_VIOLATION) {
      // Já visto (nesta sessão, em outra aba, ou num login anterior).
      return { mostrar: false };
    }

    console.error(
      "[checarKpiAtualizacaoNaoVistaAction] erro ao marcar como visto:",
      insError.message,
    );
    return { mostrar: false };
  } catch (err) {
    console.error("[checarKpiAtualizacaoNaoVistaAction] exceção:", err);
    return { mostrar: false };
  }
}
