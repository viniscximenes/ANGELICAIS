import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";

import type { DiarioCsvRow } from "./parse-diario-csv";

/**
 * Classificação e agregação das divergências do Diário, a partir das linhas
 * já parseadas do CSV. Puro: sem I/O, sem estado — recebe linhas + roster
 * válido e devolve as linhas de report prontas.
 *
 * REGRA 1 — TEMPO LOGADO
 *   Por operador+dia, soma LOGIN TIME de todas as linhas STATE=Login. Se o
 *   total < 06:20:00, gera uma linha citando o TEMPO FALTANTE (deficit).
 *
 * REGRA 2 — PAUSAS ATÍPICAS
 *   Só linhas STATE="Not Ready". REASON CODE é classificado em isento /
 *   ignorar / normal. Para cada operador+dia+REASON CODE normal, soma
 *   AGENT STATE TIME de todas as ocorrências; se a soma > 00:01:00, gera
 *   uma linha (uma por TIPO de pausa, não por ocorrência).
 */

/** Meta mínima diária de tempo logado: 06:20:00. */
export const META_TEMPO_LOGADO_SEG = 6 * 3600 + 20 * 60; // 22800
/** Piso para reportar uma pausa: soma agregada > 00:01:00. */
export const LIMITE_PAUSA_SEG = 60;

/** Placeholder do campo editável no template de Tempo Logado. */
export const PLACEHOLDER_JUSTIFICATIVA = "{PREENCHER JUSTIFICATIVA}";

/** REASON CODE que nunca vira report, por mais longo que seja (comparação lower/trim). */
const PAUSAS_ISENTAS = new Set(["pausa particular", "pausa 10", "pausa 20"]);

/**
 * REASON CODE que não são pausa e não entram em nenhum cálculo. REASON CODE
 * vazio também cai aqui.
 */
const REASONS_IGNORADOS = new Set([
  "",
  "final expediente",
  "forced",
  "logout",
  "system",
  "no reason",
  "not ready",
]);

/**
 * Tudo que não estiver nas duas listas de exceção acima e tiver
 * STATE=Not Ready é "pausa normal" — inclusive REASON CODE novos que
 * apareçam no futuro.
 */
export function classificarReason(
  reasonCode: string,
): "isento" | "ignorar" | "normal" {
  const k = reasonCode.trim().toLowerCase();
  if (REASONS_IGNORADOS.has(k)) return "ignorar";
  if (PAUSAS_ISENTAS.has(k)) return "isento";
  return "normal";
}

export type ReportDiario =
  | {
      id: string;
      tipo: "pausa";
      tema: "Pausas";
      /** DD/MM/AAAA */
      dia: string;
      op: string;
      /** Texto final, já pronto para copiar. */
      texto: string;
    }
  | {
      id: string;
      tipo: "tempo_logado";
      tema: "Tempo Logado";
      dia: string;
      op: string;
      /** Deficit HH:MM:SS = 06:20:00 − total logado. */
      tempoFaltante: string;
    };

/** Segundos -> "HH:MM:SS" (hora com no mínimo 2 dígitos). */
export function formatHMS(totalSeg: number): string {
  const s = Math.max(0, Math.round(totalSeg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(seg)}`;
}

/** Monta o texto do template de Tempo Logado com a justificativa atual. */
export function textoTempoLogado(
  r: Extract<ReportDiario, { tipo: "tempo_logado" }>,
  justificativa: string,
): string {
  const j = justificativa.trim() || PLACEHOLDER_JUSTIFICATIVA;
  // Sem pontuação final automática — o texto termina onde a justificativa
  // termina; se quiser um ponto, o gestor digita.
  return `No dia ${r.dia} o operador ${r.op} registrou ${r.tempoFaltante} de tempo logado devido a ${j}`;
}

type Grupo = {
  op: string;
  dataIso: string;
  dataBr: string;
  loginSeg: number;
  temLogin: boolean;
  /** key = REASON CODE lower/trim -> { nome exibível, soma em segundos } */
  pausas: Map<string, { nome: string; seg: number }>;
};

export function gerarReportsDiario(
  linhas: DiarioCsvRow[],
  operadoresValidos: Set<string>,
): ReportDiario[] {
  const grupos = new Map<string, Grupo>();

  for (const l of linhas) {
    // Só operadores do roster do gestor entram no relatório.
    if (!operadoresValidos.has(l.operador)) continue;

    const chave = `${l.operador}__${l.dataIso}`;
    let g = grupos.get(chave);
    if (!g) {
      g = {
        op: l.operador,
        dataIso: l.dataIso,
        dataBr: l.dataBr,
        loginSeg: 0,
        temLogin: false,
        pausas: new Map(),
      };
      grupos.set(chave, g);
    }

    const state = l.state.toLowerCase();

    if (state === "login") {
      g.temLogin = true;
      g.loginSeg += l.loginTimeSeg;
      continue;
    }

    if (state === "not ready") {
      if (classificarReason(l.reasonCode) !== "normal") continue;
      const k = l.reasonCode.trim().toLowerCase();
      const atual = g.pausas.get(k) ?? { nome: l.reasonCode.trim(), seg: 0 };
      atual.seg += l.agentStateTimeSeg;
      g.pausas.set(k, atual);
    }
  }

  const reports: ReportDiario[] = [];

  for (const g of grupos.values()) {
    // REGRA 2 — uma linha por TIPO de pausa cuja soma passou de 1 min.
    for (const p of g.pausas.values()) {
      if (p.seg <= LIMITE_PAUSA_SEG) continue;
      const tempo = formatHMS(p.seg);
      // Nome da pausa sempre em Title Case, independente do casing do CSV
      // ("pré pausa" / "PRÉ PAUSA" -> "Pré Pausa"). Sem parênteses no texto.
      const nomePausa = formatNomeProprio(p.nome);
      reports.push({
        id: `${g.op}__${g.dataIso}__pausa__${p.nome.toLowerCase()}`,
        tipo: "pausa",
        tema: "Pausas",
        dia: g.dataBr,
        op: g.op,
        texto: `No dia ${g.dataBr} o operador ${g.op} registrou ${tempo} de pausa ${nomePausa} com autorização da supervisão.`,
      });
    }

    // REGRA 1 — só avalia dias com ao menos uma sessão de Login (sem linha
    // Login não há LOGIN TIME a somar — o dia não conta como trabalhado).
    if (g.temLogin && g.loginSeg < META_TEMPO_LOGADO_SEG) {
      reports.push({
        id: `${g.op}__${g.dataIso}__tl`,
        tipo: "tempo_logado",
        tema: "Tempo Logado",
        dia: g.dataBr,
        op: g.op,
        tempoFaltante: formatHMS(META_TEMPO_LOGADO_SEG - g.loginSeg),
      });
    }
  }

  // Ordena por dia asc, operador asc, "Pausas" antes de "Tempo Logado", id asc.
  reports.sort((a, b) => {
    const ta = chaveData(a.dia);
    const tb = chaveData(b.dia);
    if (ta !== tb) return ta - tb;
    if (a.op !== b.op) return a.op.localeCompare(b.op);
    if (a.tipo !== b.tipo) return a.tipo === "pausa" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  return reports;
}

function chaveData(ddmmaaaa: string): number {
  const [d, m, y] = ddmmaaaa.split("/").map(Number);
  return y * 10000 + m * 100 + d;
}
