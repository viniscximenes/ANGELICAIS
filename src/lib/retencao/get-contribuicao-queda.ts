import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";

export type ContribItem = {
  nome: string;
  cancelados: number;
  tx: number | null;
};

export type ContribQuedaResult = {
  porMotivo: ContribItem[];
  porOperador: ContribItem[];
};

/**
 * Retorna os motivos e operadores responsáveis por cancelamentos na hora da queda (horaAtual),
 * trazendo a taxa de retenção e a quantidade absoluta de cancelamentos de cada um.
 */
export async function getContribuicaoQueda(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  horaAnterior: number,
  horaAtual: number,
): Promise<ContribQuedaResult> {
  const supabase = createAdminClient();

  // Carrega apenas os registros da hora atual (onde ocorreu a queda)
  let query = supabase
    .from("retencao_atendimentos")
    .select("motivo, usuario_login, usuario_nome, foi_cancelamento")
    .eq("hora_bucket", horaAtual);

  query = aplicarFiltroEscopo(query, { escopo, emailsEquipe });

  const { data, error } = await query;
  if (error) {
    console.error("[getContribuicaoQueda] erro de banco ao buscar detalhe da queda:", error.message);
    throw new Error(error.message);
  }

  const list = data || [];

  const statsMotivo: Record<string, { total: number; cancelados: number }> = {};
  const statsOp: Record<string, { total: number; cancelados: number }> = {};

  for (const item of list) {
    const motRaw = (item.motivo || "Sem Motivo").trim();
    let mot = motRaw;
    if (
      motRaw === "Mud. Endereço Inviabilidade" ||
      motRaw === "Mud. Endereço Viabilidade / Parcial" ||
      motRaw === "Mudança de Endereço"
    ) {
      mot = "Mud. Endereço";
    } else if (
      motRaw === "Problemas Financeiros" ||
      motRaw === "Problemas Faturamento" ||
      motRaw === "Reajuste de valor / NCC"
    ) {
      mot = "Mot. Financeiro";
    } else if (motRaw === "Insatisfação com o Atendimento") {
      mot = "Ins. Atendimento";
    } else if (
      motRaw === "Insatisfação com o Serviço" ||
      motRaw === "Insatisfação com o Produto"
    ) {
      mot = "Ins. Serviço";
    } else if (
      motRaw === "Mudança de Provedor - Qualidade" ||
      motRaw === "Mudança de Provedor - Preço" ||
      motRaw === "Mudança de Provedor -Preço"
    ) {
      mot = "Mud. Provedora";
    } else if (
      motRaw === "Óbito do Titular" ||
      motRaw === "Cliente diz já ter cancelado" ||
      motRaw === "Fraude Contratual" ||
      motRaw === "Área de Risco" ||
      motRaw === "Cliente fez novo Plano com a Giga+" ||
      motRaw === "Cliente fez novo plano com a Giga+"
    ) {
      mot = "Outros";
    }

    const opRaw = item.usuario_login || item.usuario_nome || "Operador Desconhecido";
    const op = opRaw.includes("@") ? opRaw.split("@")[0] : opRaw;

    const isCancel = item.foi_cancelamento === true;

    if (!statsMotivo[mot]) statsMotivo[mot] = { total: 0, cancelados: 0 };
    statsMotivo[mot].total++;
    if (isCancel) statsMotivo[mot].cancelados++;

    if (!statsOp[op]) statsOp[op] = { total: 0, cancelados: 0 };
    statsOp[op].total++;
    if (isCancel) statsOp[op].cancelados++;
  }

  // Monta lista de motivos com cancelamentos > 0
  const porMotivo: ContribItem[] = Object.keys(statsMotivo)
    .map((nome) => {
      const stats = statsMotivo[nome];
      const tx = stats.total > 0 ? (stats.total - stats.cancelados) / stats.total : null;
      return {
        nome,
        cancelados: stats.cancelados,
        tx,
      };
    })
    .filter((item) => item.cancelados > 0)
    .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0) || b.cancelados - a.cancelados);

  // Monta lista de operadores com cancelamentos > 0
  const porOperador: ContribItem[] = Object.keys(statsOp)
    .map((nome) => {
      const stats = statsOp[nome];
      const tx = stats.total > 0 ? (stats.total - stats.cancelados) / stats.total : null;
      return {
        nome,
        cancelados: stats.cancelados,
        tx,
      };
    })
    .filter((item) => item.cancelados > 0 && item.tx === 0)
    .sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0) || b.cancelados - a.cancelados);

  return { porMotivo, porOperador };
}
