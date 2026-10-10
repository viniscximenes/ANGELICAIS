import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { lerAtendimentosTma } from "./ler-atendimentos-tma";

export type AtendimentoTma = {
  hora: string | null;
  telefoneCliente: string | null;
  skill: string | null;
  duracaoSegundos: number;
};

/**
 * Atendimentos do dia de UM operador da equipe do gestor
 * (d1_tma_atendimentos), por horário — buscados só quando o modal de
 * detalhamento abre (getAtendimentosOperadorTmaAction). Antes vinham os da
 * equipe inteira (com telefone de cliente) no payload da página e de novo a
 * cada 30s no polling, embora só fossem usados com o modal aberto.
 *
 * O filtro por gestor_id garante que só sai atendimento da própria equipe.
 * Erro de banco: null (o modal mostra o erro, não "sem atendimentos").
 */
export async function getGestorTmaAtendimentos(
  gestorId: string,
  operatorEmail: string,
): Promise<AtendimentoTma[] | null> {
  type Linha = {
    hora: string | null;
    telefone_cliente: string | null;
    skill: string | null;
    duracao_segundos: number;
  };

  try {
    // Paginado (lerAtendimentosTma): sem isso o PostgREST cortaria em 1000
    // linhas em silêncio.
    const linhas = await lerAtendimentosTma<Linha>(
      (supabase) =>
        supabase
          .from("d1_tma_atendimentos")
          .select("hora, telefone_cliente, skill, duracao_segundos")
          .eq("gestor_id", gestorId)
          .eq("operator_email", operatorEmail)
          .order("hora", { ascending: true }),
      dataRefHojeBR(),
      "get-gestor-tma-atendimentos",
    );
    return linhas.map((row) => ({
      hora: row.hora,
      telefoneCliente: row.telefone_cliente,
      skill: row.skill,
      duracaoSegundos: row.duracao_segundos,
    }));
  } catch (err) {
    console.error("[get-gestor-tma-atendimentos] erro:", err instanceof Error ? err.message : err);
    return null;
  }
}
