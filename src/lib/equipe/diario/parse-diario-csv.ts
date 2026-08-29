import Papa from "papaparse";

/**
 * Parser do CSV de login/logout/pausas da página /operacao/diario.
 *
 * DELIBERADAMENTE independente de parse-tempo-logado-csv.ts — nenhuma lógica,
 * tipo ou estado é compartilhado entre as duas telas. Se o formato de uma
 * mudar, a outra não quebra.
 *
 * Entrada: CSV delimitado por ";" com as colunas
 * AGENT NAME;AGENT;TIMESTAMP;DATE;HOUR;LOGIN TIMESTAMP;LOGOUT TIMESTAMP;LOGIN TIME;AGENT STATE TIME;REASON CODE;STATE
 */

export type DiarioCsvRow = {
  /** Prefixo de AGENT antes do "@", minúsculo (ex.: "abner.azeredo"). */
  operador: string;
  /** DATE normalizada para YYYY-MM-DD — chave de agrupamento por dia. */
  dataIso: string;
  /** DATE formatada para exibição/report: DD/MM/AAAA. */
  dataBr: string;
  /** STATE original, sem espaços nas pontas. */
  state: string;
  /** REASON CODE original, sem espaços nas pontas ("" quando vazio). */
  reasonCode: string;
  /** LOGIN TIME convertido para segundos (0 quando ausente/ inválido). */
  loginTimeSeg: number;
  /** AGENT STATE TIME convertido para segundos (0 quando ausente/inválido). */
  agentStateTimeSeg: number;
};

export type ParseDiarioResult = {
  linhas: DiarioCsvRow[];
  lidas: number;
  validas: number;
  puladas: number;
  /** Mensagem de erro fatal (cabeçalho ausente, CSV vazio). null = ok. */
  erro: string | null;
};

const COLUNAS_OBRIGATORIAS = [
  "AGENT",
  "DATE",
  "LOGIN TIME",
  "AGENT STATE TIME",
  "REASON CODE",
  "STATE",
] as const;

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, " ");
}

/** "HH:MM:SS" (aceita 1–4 dígitos na hora) -> segundos. Qualquer outra coisa -> 0. */
function duracaoParaSegundos(val: string | undefined): number {
  if (!val) return 0;
  const m = val.trim().match(/^(\d{1,4}):([0-5]?\d):([0-5]?\d)$/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** DATE "AAAA/MM/DD" (com "/" ou "-") -> { iso: YYYY-MM-DD, br: DD/MM/AAAA }. */
function parseData(
  val: string | undefined,
): { iso: string; br: string } | null {
  if (!val) return null;
  const m = val.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  const [, ano, mes, dia] = m;
  const mm = mes.padStart(2, "0");
  const dd = dia.padStart(2, "0");
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) {
    return null;
  }
  return { iso: `${ano}-${mm}-${dd}`, br: `${dd}/${mm}/${ano}` };
}

export function parseDiarioCsv(csvText: string): ParseDiarioResult {
  const parsed = Papa.parse<string[]>(csvText, {
    delimiter: ";",
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.warn("[parse-diario-csv] avisos do Papa.parse:", parsed.errors);
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    return {
      linhas: [],
      lidas: 0,
      validas: 0,
      puladas: 0,
      erro: "CSV vazio ou sem linhas de dados.",
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);

  const faltando = COLUNAS_OBRIGATORIAS.filter((c) => idx(c) === -1);
  if (faltando.length > 0) {
    return {
      linhas: [],
      lidas: 0,
      validas: 0,
      puladas: 0,
      erro: `Colunas obrigatórias ausentes no CSV: ${faltando.join(", ")}`,
    };
  }

  const iAgent = idx("AGENT");
  const iDate = idx("DATE");
  const iLoginTime = idx("LOGIN TIME");
  const iStateTime = idx("AGENT STATE TIME");
  const iReason = idx("REASON CODE");
  const iState = idx("STATE");

  const linhas: DiarioCsvRow[] = [];
  let lidas = 0;
  let validas = 0;
  let puladas = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    lidas++;

    const agent = (row[iAgent] ?? "").trim();
    const state = (row[iState] ?? "").trim();
    const data = parseData(row[iDate]);
    const operador = agent.split("@")[0]?.trim().toLowerCase() ?? "";

    // Sem operador identificável, sem STATE ou sem DATE válida a linha não
    // entra em nenhum cálculo.
    if (!operador || !state || !data) {
      puladas++;
      continue;
    }

    linhas.push({
      operador,
      dataIso: data.iso,
      dataBr: data.br,
      state,
      reasonCode: (row[iReason] ?? "").trim(),
      loginTimeSeg: duracaoParaSegundos(row[iLoginTime]),
      agentStateTimeSeg: duracaoParaSegundos(row[iStateTime]),
    });
    validas++;
  }

  return { linhas, lidas, validas, puladas, erro: null };
}
