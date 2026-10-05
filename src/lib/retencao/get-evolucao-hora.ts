import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS, bucketDe } from "./buckets-hora";
import { dedupePorContrato } from "./dedupe-por-contrato";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";
import { normalizarTema } from "./normalizar-tema";

// Reexportados pra não mudar quem já importa daqui (código server).
export { BUCKETS, bucketDe };

export type TemaHoraData = {
  motivo: string;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null; // null se total = 0
};

/**
 * Peso de um operador na taxa da equipe dentro de uma hora — mesmo conceito
 * do "Quem derrubou nesta hora" do /c (impactoSemEquipe em
 * get-coordenador-consolidado.ts), trocando supervisor por operador.
 */
export type OperadorHoraData = {
  login: string;
  retidos: number;
  cancelados: number;
  /** Quanto a taxa da hora subiria sem este operador (positivo = derrubou). */
  impacto: number | null;
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
  /**
   * Operadores com atendimento na hora, quem mais derrubou primeiro. Só
   * preenchido com `{ porOperador: true }` (/s/reports/consolidado).
   */
  operadores?: OperadorHoraData[];
};

function impactoSemOperador(
  total: { retidos: number; cancelados: number },
  op: { retidos: number; cancelados: number },
): number | null {
  const pedidosTotal = total.retidos + total.cancelados;
  const pedidosOp = op.retidos + op.cancelados;
  const pedidosSem = pedidosTotal - pedidosOp;
  if (pedidosTotal === 0 || pedidosOp === 0 || pedidosSem === 0) return null;
  return (total.retidos - op.retidos) / pedidosSem - total.retidos / pedidosTotal;
}

/**
 * Evolução da taxa de retenção e volume por bucket de hora, no dia inteiro,
 * para a equipe do gestor. A agregação acontece aqui (não no componente).
 */
export async function getEvolucaoHora(
  emailsEquipe: string[],
  opcoes: { porOperador?: boolean } = {},
): Promise<HoraEvolucaoData[]> {
  const supabase = createAdminClient();

  // Sem recorte de horas: os buckets das pontas ("< 08" e "≥ 20") precisam
  // enxergar os atendimentos fora da janela de operação.
  let allData: {
    usuario_login: string | null;
    cod_air: string | null;
    status_hora: string | null;
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
      .select(
        "usuario_login, cod_air, status_hora, hora_bucket, foi_cancelamento, motivo, status_retencao",
      )
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
      operadores: Map<string, { retidos: number; cancelados: number }>;
    }
  >();
  for (const b of BUCKETS) {
    map.set(b.hora, { total: 0, retidos: 0, cancelados: 0, temas: new Map(), operadores: new Map() });
  }

  const linhasFinais = dedupePorContrato(allData);

  for (const item of linhasFinais) {
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

    if (opcoes.porOperador && item.usuario_login) {
      const login = item.usuario_login.trim().toLowerCase();
      const opAgg = alvo.operadores.get(login) ?? { retidos: 0, cancelados: 0 };
      if (isCancelado) opAgg.cancelados++;
      else opAgg.retidos++;
      alvo.operadores.set(login, opAgg);
    }
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
      ...(opcoes.porOperador && {
        operadores: [...agg.operadores.entries()]
          .map(([login, o]) => ({
            login,
            retidos: o.retidos,
            cancelados: o.cancelados,
            impacto: impactoSemOperador(agg, o),
          }))
          .sort((a, b) => (b.impacto ?? -Infinity) - (a.impacto ?? -Infinity)),
      }),
    };
  });
}
