import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";
import { dataRefHojeBR } from "./parse";
import type { ContratoItem, MotivosBreakdown, UserD1View } from "./types";

const EMPTY: UserD1View = {
  operador: null,
  contratos: null,
  motivos: null,
  horaReport: "—",
};

/**
 * Lê o D-1 Consolidado pessoal de um operador (d1_consolidado, data de
 * hoje). Substitui getD1Data + filterByUserEmail (Sheets) — mesmo shape de
 * retorno (UserD1View), pras seções de KPI/motivos/contratos não mudarem.
 */
export async function getOperadorConsolidado(email: string): Promise<UserD1View> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("d1_consolidado")
    .select(
      "operator_email, supervisor, retidos, cancelados, pedidos, tx_retencao, motivos_retidos, motivos_cancelados, contratos_retidos, contratos_cancelados, report_hora",
    )
    .in("operator_email", getEmailVariants(email))
    .eq("data_ref", dataRefHojeBR())
    .maybeSingle();

  if (error) {
    console.error("[get-operador-consolidado] erro ao buscar d1_consolidado:", error.message);
    return EMPTY;
  }

  if (!data) return EMPTY;

  const zeroBreakdown: MotivosBreakdown = {
    financeiro: 0,
    mudancaEndereco: 0,
    insatisfacaoServico: 0,
    insatisfacaoAtendimento: 0,
    mudancaProvedora: 0,
    outros: 0,
  };

  // PEDIDOS = RETIDOS + CANCELADOS — derivado aqui (em vez de confiar em
  // data.pedidos) pra não depender de reprocessar o upload sempre que essa
  // regra mudar.
  const retidos = data.retidos ?? 0;
  const cancelados = data.cancelados ?? 0;

  return {
    operador: {
      email: data.operator_email,
      supervisor: data.supervisor ?? "",
      retidos,
      cancelados,
      pedidos: retidos + cancelados,
      txRetencao: data.tx_retencao,
    },
    contratos: {
      email: data.operator_email,
      cancelados: (data.contratos_cancelados as ContratoItem[] | null) ?? [],
      retidos: (data.contratos_retidos as ContratoItem[] | null) ?? [],
    },
    motivos: {
      email: data.operator_email,
      cancelados: (data.motivos_cancelados as MotivosBreakdown | null) ?? zeroBreakdown,
      retidos: (data.motivos_retidos as MotivosBreakdown | null) ?? zeroBreakdown,
    },
    horaReport: data.report_hora ?? "—",
  };
}
