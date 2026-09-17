import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "@/lib/d1-db/parse";

export type AtendimentoTma = {
  hora: string | null;
  telefoneCliente: string | null;
  skill: string | null;
  duracaoSegundos: number;
};

/**
 * Atendimentos do dia de toda a equipe do gestor (d1_tma_atendimentos),
 * agrupados por operator_email — carrega tudo de uma vez pra o modal de
 * detalhamento não precisar de round-trip ao abrir (volume é o de um dia
 * de uma equipe, não da empresa toda).
 */
export async function getGestorTmaAtendimentos(
  gestorId: string,
): Promise<Map<string, AtendimentoTma[]>> {
  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();

  const { data, error } = await admin
    .from("d1_tma_atendimentos")
    .select("operator_email, hora, telefone_cliente, skill, duracao_segundos")
    .eq("gestor_id", gestorId)
    .eq("data_ref", dataRef)
    .order("hora", { ascending: true });

  if (error) {
    console.error("[get-gestor-tma-atendimentos] erro:", error.message);
    return new Map();
  }

  const porOperador = new Map<string, AtendimentoTma[]>();
  for (const row of data ?? []) {
    const lista = porOperador.get(row.operator_email) ?? [];
    lista.push({
      hora: row.hora,
      telefoneCliente: row.telefone_cliente,
      skill: row.skill,
      duracaoSegundos: row.duracao_segundos,
    });
    porOperador.set(row.operator_email, lista);
  }
  return porOperador;
}
