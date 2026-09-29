import { createAdminClient } from "@/lib/supabase/admin";
import { dedupePorContrato } from "./dedupe-por-contrato";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";

export type OperadorFaixaData = {
  /** usuario_login (e-mail) — o nome exibido é resolvido no client. */
  login: string;
  /** Pedidos e cancelamentos do operador SÓ nesta faixa. */
  total: number;
  cancelados: number;
};

export type FaixaAcumuladaData = {
  /** Início da faixa em minutos desde 00:00 (ex.: 13:30 → 810). */
  inicioMin: number;
  /** "13:30" — rótulo do eixo. */
  label: string;
  /** "13:30 – 13:59" — faixa completa, pro tooltip. */
  faixa: string;
  /** Só os atendimentos desta faixa de 30 min. */
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
  /** Somados desde a primeira faixa do dia até esta (inclusive). */
  totalAcum: number;
  retidosAcum: number;
  canceladosAcum: number;
  txAcum: number | null;
  /** txAcum desta faixa − txAcum da faixa anterior (null na primeira). */
  variacao: number | null;
  /**
   * Operadores com cancelamento NESTA faixa (quem puxou a taxa pra baixo),
   * mais cancelamentos primeiro.
   */
  operadoresQueda: OperadorFaixaData[];
};

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Evolução ACUMULADA da taxa de retenção em faixas de 30 minutos, no dia
 * inteiro, para a equipe do gestor. Mesma base e mesmas regras de
 * getEvolucaoHora (dedupe por contrato, "abortado" fora do total), só que:
 * - faixas de 30 min (hora de hora_bucket + minuto de status_hora);
 * - só as faixas COM atendimento (sem colunas vazias);
 * - cada faixa carrega também os totais acumulados desde o início do dia.
 *
 * Arquivo próprio (não altera getEvolucaoHora, que também atende
 * /operacao/comparativo-consolidado e os alertas).
 */
export async function getEvolucaoAcumulada(
  emailsEquipe: string[],
): Promise<FaixaAcumuladaData[]> {
  const supabase = createAdminClient();

  let allData: {
    usuario_login: string | null;
    cod_air: string | null;
    status_hora: string | null;
    hora_bucket: number | null;
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
      .select("usuario_login, cod_air, status_hora, hora_bucket, foi_cancelamento, status_retencao")
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getEvolucaoAcumulada] erro ao buscar atendimentos:", error.message);
      throw new Error(error.message);
    }

    const list = data || [];
    allData = allData.concat(list);
    hasMore = list.length === pageSize;
    page++;
  }

  const porFaixa = new Map<
    number,
    {
      total: number;
      retidos: number;
      cancelados: number;
      operadores: Map<string, { total: number; cancelados: number }>;
    }
  >();

  for (const item of dedupePorContrato(allData)) {
    const h = item.hora_bucket;
    if (h === null || h === undefined || !item.status_hora) continue;

    // Minuto direto da string ISO ("2026-09-28T13:47:00-03:00" ou já
    // normalizada em UTC) — o fuso é deslocado em horas cheias, então o
    // minuto é o mesmo; a hora vem de hora_bucket (mesma régua do gráfico
    // por hora).
    const m = item.status_hora.match(/T\d{2}:(\d{2})/);
    if (!m) continue;
    const minuto = parseInt(m[1], 10);

    const classe = classificarAtendimento(item);
    if (classe === "abortado") continue;

    const inicio = h * 60 + (minuto >= 30 ? 30 : 0);
    const alvo = porFaixa.get(inicio) ?? {
      total: 0,
      retidos: 0,
      cancelados: 0,
      operadores: new Map<string, { total: number; cancelados: number }>(),
    };
    alvo.total++;
    if (classe === "cancelado") alvo.cancelados++;
    else alvo.retidos++;

    const login = (item.usuario_login ?? "").trim().toLowerCase();
    if (login) {
      const op = alvo.operadores.get(login) ?? { total: 0, cancelados: 0 };
      op.total++;
      if (classe === "cancelado") op.cancelados++;
      alvo.operadores.set(login, op);
    }
    porFaixa.set(inicio, alvo);
  }

  let totalAcum = 0;
  let retidosAcum = 0;
  let canceladosAcum = 0;
  let txAnterior: number | null = null;

  return [...porFaixa.entries()]
    .sort(([a], [b]) => a - b)
    .map(([inicioMin, f]) => {
      totalAcum += f.total;
      retidosAcum += f.retidos;
      canceladosAcum += f.cancelados;
      const txAcum = totalAcum > 0 ? retidosAcum / totalAcum : null;
      const variacao = txAcum !== null && txAnterior !== null ? txAcum - txAnterior : null;
      txAnterior = txAcum;

      return {
        inicioMin,
        label: hhmm(inicioMin),
        faixa: `${hhmm(inicioMin)} – ${hhmm(inicioMin + 29)}`,
        total: f.total,
        retidos: f.retidos,
        cancelados: f.cancelados,
        tx: f.total > 0 ? f.retidos / f.total : null,
        totalAcum,
        retidosAcum,
        canceladosAcum,
        txAcum,
        variacao,
        operadoresQueda: [...f.operadores.entries()]
          .filter(([, o]) => o.cancelados > 0)
          .map(([login, o]) => ({ login, total: o.total, cancelados: o.cancelados }))
          .sort((a, b) => b.cancelados - a.cancelados || b.total - a.total),
      };
    });
}
