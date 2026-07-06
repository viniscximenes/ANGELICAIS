import { getPorTema } from "./get-por-tema";

export type Quadrante = "urgente" | "estavel" | "alerta" | "positivo";

export type MatrizMotivoItem = {
  motivo: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
  impacto: number; // Clientes perdidos estimados: total * (1 - tx)
  quadrante: Quadrante;
};

export type MatrizResult = {
  items: MatrizMotivoItem[];
  medianaVolume: number;
  medianaTx: number;
};

function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Retorna os motivos sob o conceito da Matriz Volume x Taxa de Retenção.
 * 
 * Calcula o impacto absoluto e divide os motivos nos 4 quadrantes analíticos baseados nas medianas.
 */
export async function getMatrizVolumeTaxa(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  periodo: { horaInicio: number; horaFim: number } | null,
): Promise<MatrizResult> {
  const temas = await getPorTema(escopo, emailsEquipe, periodo);

  const rawItems = temas.map((t) => {
    const txVal = t.tx !== null ? t.tx : 0;
    const impacto = Math.round(t.total * (1 - txVal));
    return {
      motivo: t.motivo,
      total: t.total,
      retidos: t.retidos,
      cancelados: t.cancelados,
      tx: t.tx,
      impacto,
    };
  });

  // Calcula medianas de volume e taxas para os cortes de quadrante
  const volumes = rawItems.map((item) => item.total);
  const taxas = rawItems.filter((item) => item.tx !== null).map((item) => item.tx as number);

  const medianaVolume = calculateMedian(volumes);
  const medianaTx = calculateMedian(taxas);

  const items = rawItems.map((item): MatrizMotivoItem => {
    const txVal = item.tx !== null ? item.tx : 0;
    let quadrante: Quadrante = "positivo";

    const isHighVolume = item.total >= medianaVolume;
    const isLowTx = txVal < medianaTx;

    if (isHighVolume && isLowTx) {
      quadrante = "urgente";
    } else if (isHighVolume && !isLowTx) {
      quadrante = "estavel";
    } else if (!isHighVolume && isLowTx) {
      quadrante = "alerta";
    } else {
      quadrante = "positivo";
    }

    return {
      ...item,
      quadrante,
    };
  });

  // Ordena por impacto decrescente (motivos que mais sangram no topo)
  items.sort((a, b) => b.impacto - a.impacto);

  return {
    items,
    medianaVolume,
    medianaTx,
  };
}
