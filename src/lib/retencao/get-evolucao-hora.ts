import { createAdminClient } from "@/lib/supabase/admin";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";
import { normalizarTema } from "./normalizar-tema";

export type TemaHoraData = {
  motivo: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null; // null se total = 0
};

export type HoraEvolucaoData = {
  /** Chave do bucket. 7 = "< 08", 8..19 = a própria hora, 20 = "≥ 20". */
  hora: number;
  label: string; // "< 08" · "08:00" · "≥ 20"
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null; // null se total = 0
  /**
   * Retenção por tema, calculada só com os atendimentos deste bucket de
   * hora — mesmo agrupamento de `getPorTema`, mas com o corte adicional de
   * hora. Opcional porque `get-por-operador-individual` monta seu próprio
   * `HoraEvolucaoData[]` (breakdown por operador) sem essa dimensão.
   */
  porTema?: TemaHoraData[];
};

/**
 * Horas de operação (08h–19h). Usado pelos alertas para varrer hora a hora.
 */
export const HORAS_OPERACAO = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const BUCKET_ANTES = 7;
const BUCKET_DEPOIS = 20;

/**
 * Os 14 buckets do gráfico: tudo antes das 08h num só, cada hora cheia entre
 * 08h e 19h, e tudo a partir das 20h num só. Assim nenhum atendimento fica de
 * fora do gráfico, mesmo os registrados fora da janela de operação.
 */
export const BUCKETS: { hora: number; label: string }[] = [
  { hora: BUCKET_ANTES, label: "< 08" },
  ...HORAS_OPERACAO.map((h) => ({
    hora: h,
    label: `${String(h).padStart(2, "0")}:00`,
  })),
  { hora: BUCKET_DEPOIS, label: "≥ 20" },
];

/**
 * Encaixa uma hora_bucket crua no bucket correspondente. Exportada para que a
 * análise individual por operador use exatamente a mesma régua do gráfico
 * geral — se os buckets mudarem aqui, mudam nos dois lugares.
 */
export function bucketDe(hora: number): number {
  if (hora < 8) return BUCKET_ANTES;
  if (hora >= 20) return BUCKET_DEPOIS;
  return hora;
}

/**
 * Evolução da taxa de retenção e volume por bucket de hora, no dia inteiro,
 * para a equipe do gestor. A agregação acontece aqui (não no componente).
 */
export async function getEvolucaoHora(
  emailsEquipe: string[],
): Promise<HoraEvolucaoData[]> {
  const supabase = createAdminClient();

  // Sem recorte de horas: os buckets das pontas ("< 08" e "≥ 20") precisam
  // enxergar os atendimentos fora da janela de operação.
  let allData: {
    hora_bucket: number | null;
    foi_cancelamento: boolean | null;
    motivo: string | null;
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
      .select("hora_bucket, foi_cancelamento, motivo, status_retencao")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getEvolucaoHora] erro ao buscar evolução por hora:", error.message);
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

  const map = new Map<
    number,
    {
      total: number;
      retidos: number;
      cancelados: number;
      temas: Map<string, { total: number; retidos: number; cancelados: number }>;
    }
  >();
  for (const b of BUCKETS) {
    map.set(b.hora, { total: 0, retidos: 0, cancelados: 0, temas: new Map() });
  }

  for (const item of allData) {
    const h = item.hora_bucket;
    // Sem hora não dá pra posicionar no eixo — fica fora do gráfico.
    if (h === null || h === undefined) continue;

    const alvo = map.get(bucketDe(h));
    if (!alvo) continue;

    // "Abortado" não é nem sucesso nem fracasso de retenção — fica fora de
    // retidos, cancelados e do total (= PEDIDOS = RETIDOS + CANCELADOS).
    const classe = classificarAtendimento(item);
    if (classe === "abortado") continue;
    const isCancelado = classe === "cancelado";

    alvo.total++;
    if (isCancelado) {
      alvo.cancelados++;
    } else {
      alvo.retidos++;
    }

    // Mesmo agrupamento do bloco "Retenção por Tema" (getPorTema), aplicado
    // dentro do bucket de hora.
    const tema = normalizarTema(item.motivo);
    const temaAgg = alvo.temas.get(tema) ?? { total: 0, retidos: 0, cancelados: 0 };
    temaAgg.total++;
    if (isCancelado) {
      temaAgg.cancelados++;
    } else {
      temaAgg.retidos++;
    }
    alvo.temas.set(tema, temaAgg);
  }

  return BUCKETS.map((b) => {
    const agg = map.get(b.hora)!;
    const porTema: TemaHoraData[] = [...agg.temas.entries()].map(([motivo, t]) => ({
      motivo,
      total: t.total,
      retidos: t.retidos,
      cancelados: t.cancelados,
      tx: t.total > 0 ? t.retidos / t.total : null,
    }));

    return {
      hora: b.hora,
      label: b.label,
      total: agg.total,
      retidos: agg.retidos,
      cancelados: agg.cancelados,
      tx: agg.total > 0 ? agg.retidos / agg.total : null,
      porTema,
    };
  });
}
