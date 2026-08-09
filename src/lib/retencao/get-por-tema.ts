import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";
import { normalizarTema } from "./normalizar-tema";

export type SubmotivoData = {
  submotivo: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
};

export type TemaData = {
  motivo: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
  submotivos: SubmotivoData[];
};

/**
 * Consulta e agrupa os atendimentos por motivo e submotivo.
 * 
 * Ordenação padrão: por total decrescente (mais atendimentos primeiro).
 */
export async function getPorTema(
  emailsEquipe: string[],
): Promise<TemaData[]> {
  const supabase = createAdminClient();
  let allData: { motivo: string | null; submotivo: string | null; foi_cancelamento: boolean | null }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("motivo, submotivo, foi_cancelamento")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getPorTema] erro ao buscar motivos de retenção:", error.message);
      throw new Error(error.message);
    }

    const list = data || [];
    allData = allData.concat(list);

    if (list.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  const list = allData;

  const map: Record<string, {
    motivo: string;
    total: number;
    retidos: number;
    cancelados: number;
    submotivosMap: Record<string, {
      submotivo: string;
      total: number;
      retidos: number;
      cancelados: number;
    }>;
  }> = {};

  for (const item of list) {
    const mot = normalizarTema(item.motivo);

    const rawMot = (item.motivo || "Outros").trim();
    const rawSub = (item.submotivo || "Sem Submotivo").trim();

    // Formata o submotivo no padrão real do banco: "Tema principal real / Tema secundario real"
    let sub = rawSub;
    if (rawSub === "Sem Submotivo" || rawSub.toLowerCase() === rawMot.toLowerCase()) {
      sub = `${rawMot} / Sem Submotivo`;
    } else if (!rawSub.includes("/")) {
      sub = `${rawMot} / ${rawSub}`;
    }

    const isCancel = item.foi_cancelamento === true;

    if (!map[mot]) {
      map[mot] = {
        motivo: mot,
        total: 0,
        retidos: 0,
        cancelados: 0,
        submotivosMap: {},
      };
    }

    const motObj = map[mot];
    motObj.total++;
    if (isCancel) {
      motObj.cancelados++;
    } else {
      motObj.retidos++;
    }

    if (!motObj.submotivosMap[sub]) {
      motObj.submotivosMap[sub] = {
        submotivo: sub,
        total: 0,
        retidos: 0,
        cancelados: 0,
      };
    }

    const subObj = motObj.submotivosMap[sub];
    subObj.total++;
    if (isCancel) {
      subObj.cancelados++;
    } else {
      subObj.retidos++;
    }
  }

  const result: TemaData[] = Object.values(map).map((m) => {
    const submotivos: SubmotivoData[] = Object.values(m.submotivosMap).map((s) => ({
      submotivo: s.submotivo,
      total: s.total,
      retidos: s.retidos,
      cancelados: s.cancelados,
      tx: s.total > 0 ? s.retidos / s.total : null,
    }));

    // Ordenação interna dos submotivos: tx ASC (pior taxa para a melhor)
    submotivos.sort((a, b) => {
      if (a.tx === null) return 1;
      if (b.tx === null) return -1;
      return a.tx - b.tx;
    });

    return {
      motivo: m.motivo,
      total: m.total,
      retidos: m.retidos,
      cancelados: m.cancelados,
      tx: m.total > 0 ? m.retidos / m.total : null,
      submotivos,
    };
  });

  // Ordenação principal: volume total DESC (motivos mais volumosos no topo)
  result.sort((a, b) => b.total - a.total);

  return result;
}
