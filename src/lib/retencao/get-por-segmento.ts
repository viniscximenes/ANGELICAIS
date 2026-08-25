import { createAdminClient } from "@/lib/supabase/admin";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";

export type SegmentoItem = {
  nome: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
};

export type SegmentoResult = {
  porMarca: SegmentoItem[];
  porUnidade: SegmentoItem[];
  porEquipe: SegmentoItem[];
};

/**
 * Consulta e agrupa atendimentos por três dimensões: Marca, Unidade e Equipe.
 * 
 * Ordenação padrão: Volume de atendimentos decrescente (total DESC).
 */
export async function getPorSegmento(
  emailsEquipe: string[],
): Promise<SegmentoResult> {
  const supabase = createAdminClient();
  let allData: {
    marca: string | null;
    unidade_nome: string | null;
    ult_equipe: string | null;
    foi_cancelamento: boolean | null;
    status_retencao: string | null;
  }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select("marca, unidade_nome, ult_equipe, foi_cancelamento, status_retencao")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getPorSegmento] erro ao buscar dados por segmento:", error.message);
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

  const marcas: Record<string, { total: number; retidos: number; cancelados: number }> = {};
  const unidades: Record<string, { total: number; retidos: number; cancelados: number }> = {};
  const equipes: Record<string, { total: number; retidos: number; cancelados: number }> = {};

  for (const item of list) {
    // "Abortado" não é nem sucesso nem fracasso de retenção — fica fora de
    // retidos, cancelados e do total (= PEDIDOS = RETIDOS + CANCELADOS).
    const classe = classificarAtendimento(item);
    if (classe === "abortado") continue;
    const isCancelado = classe === "cancelado";
    const marcaKey = (item.marca || "Desconhecida").trim();
    const unidadeKey = (item.unidade_nome || "Desconhecida").trim();
    const equipeKey = (item.ult_equipe || "Sem Equipe").trim();

    // 1. Marca
    if (!marcas[marcaKey]) marcas[marcaKey] = { total: 0, retidos: 0, cancelados: 0 };
    marcas[marcaKey].total += 1;
    if (isCancelado) marcas[marcaKey].cancelados += 1;
    else marcas[marcaKey].retidos += 1;

    // 2. Unidade
    if (!unidades[unidadeKey]) unidades[unidadeKey] = { total: 0, retidos: 0, cancelados: 0 };
    unidades[unidadeKey].total += 1;
    if (isCancelado) unidades[unidadeKey].cancelados += 1;
    else unidades[unidadeKey].retidos += 1;

    // 3. Equipe
    if (!equipes[equipeKey]) equipes[equipeKey] = { total: 0, retidos: 0, cancelados: 0 };
    equipes[equipeKey].total += 1;
    if (isCancelado) equipes[equipeKey].cancelados += 1;
    else equipes[equipeKey].retidos += 1;
  }

  const mapToSegmentoList = (record: Record<string, { total: number; retidos: number; cancelados: number }>) => {
    return Object.entries(record).map(([nome, vals]) => ({
      nome,
      total: vals.total,
      retidos: vals.retidos,
      cancelados: vals.cancelados,
      tx: vals.total > 0 ? vals.retidos / vals.total : null,
    })).sort((a, b) => b.total - a.total); // Ordenado por Volume Total DESC
  };

  return {
    porMarca: mapToSegmentoList(marcas),
    porUnidade: mapToSegmentoList(unidades),
    porEquipe: mapToSegmentoList(equipes),
  };
}
