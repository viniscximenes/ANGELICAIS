import { createAdminClient } from "@/lib/supabase/admin";
import { dedupePorContrato } from "./dedupe-por-contrato";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";
import { NOME_ESTADO, ufDaUnidade } from "./uf-por-unidade";

export type SegmentoItem = {
  nome: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
};

export type EstadoSegmentoItem = SegmentoItem & {
  /** "RJ" · "SP" · ... — "??" quando a unidade não está no mapa. */
  uf: string;
  /** Unidades (cidades) do estado, com a mesma agregação de porUnidade. */
  unidades: SegmentoItem[];
};

export type SegmentoResult = {
  porMarca: SegmentoItem[];
  porUnidade: SegmentoItem[];
  porEquipe: SegmentoItem[];
  /**
   * porUnidade agrupado por estado (UF resolvida por uf-por-unidade.ts,
   * a base não traz a UF). Unidade fora do mapa vai pra "Não identificado".
   */
  porEstado: EstadoSegmentoItem[];
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
    usuario_login: string | null;
    cod_air: string | null;
    status_hora: string | null;
    marca: string | null;
    unidade_nome: string | null;
    unidade_sigla: string | null;
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
      .select(
        "usuario_login, cod_air, status_hora, marca, unidade_nome, unidade_sigla, ult_equipe, foi_cancelamento, status_retencao",
      )
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

  const list = dedupePorContrato(allData);

  const marcas: Record<string, { total: number; retidos: number; cancelados: number }> = {};
  const unidades: Record<string, { total: number; retidos: number; cancelados: number }> = {};
  const equipes: Record<string, { total: number; retidos: number; cancelados: number }> = {};
  // UF de cada unidade (pela primeira sigla vista) — pra montar porEstado.
  const ufPorUnidade: Record<string, string> = {};

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
    if (!(unidadeKey in ufPorUnidade)) {
      ufPorUnidade[unidadeKey] = ufDaUnidade(unidadeKey, item.unidade_sigla) ?? "??";
    }

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

  const porUnidade = mapToSegmentoList(unidades);

  const estados = new Map<string, SegmentoItem[]>();
  for (const unidade of porUnidade) {
    const uf = ufPorUnidade[unidade.nome] ?? "??";
    estados.set(uf, [...(estados.get(uf) ?? []), unidade]);
  }
  const porEstado: EstadoSegmentoItem[] = [...estados.entries()].map(([uf, lista]) => {
    const total = lista.reduce((acc, u) => acc + u.total, 0);
    const retidos = lista.reduce((acc, u) => acc + u.retidos, 0);
    const cancelados = lista.reduce((acc, u) => acc + u.cancelados, 0);
    return {
      uf,
      nome: NOME_ESTADO[uf] ?? "Não identificado",
      total,
      retidos,
      cancelados,
      tx: total > 0 ? retidos / total : null,
      unidades: lista,
    };
  });

  return {
    porMarca: mapToSegmentoList(marcas),
    porUnidade,
    porEquipe: mapToSegmentoList(equipes),
    porEstado,
  };
}
