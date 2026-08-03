import Papa from "papaparse";

/**
 * Parser da BASE - 2 (CSV de tempo logado / pausas, mesmo formato de 11
 * colunas do CSV do Diário de Bordo — ver docs/pages/diario-de-bordo.md e
 * docs/pages/gestor-tempo-logado.md). Implementação própria (não reaproveita
 * src/lib/db/parse-csv-pausas.ts) porque aqui também precisamos de LOGIN
 * TIMESTAMP / LOGOUT TIMESTAMP (hora de login/logout do operador), que o
 * parser do Diário de Bordo não captura.
 */

export type TempoLogadoCsvRow = {
  agent_user: string; // prefixo do email (chave de agrupamento por operador)
  agent_email: string;
  agent_name: string;
  data_ref: string; // YYYY-MM-DD
  state: string;
  reason_code: string | null;
  login_time_seg: number | null;
  agent_state_time_seg: number | null;
  /** "HH:MM:SS" extraído do timestamp completo — só presente quando state === "login". */
  login_timestamp_hora: string | null;
  /** idem — null se a sessão de login ainda está aberta (sem logout registrado). */
  logout_timestamp_hora: string | null;
};

export type ParseTempoLogadoCsvResult = {
  linhas: TempoLogadoCsvRow[];
  lidas: number;
  validas: number;
  puladas: number;
};

const REQUIRED_COLUMNS = [
  "AGENT NAME",
  "AGENT",
  "DATE",
  "LOGIN TIME",
  "AGENT STATE TIME",
  "REASON CODE",
  "STATE",
  "LOGIN TIMESTAMP",
  "LOGOUT TIMESTAMP",
] as const;

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, " ");
}

function parseHoraParaSegundos(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (!cleaned) return null;
  const m = cleaned.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
}

/** Extrai o "HH:MM:SS" final de um timestamp completo (ex: "Tue, 26 May 2026 14:04:52" -> "14:04:52"). */
function extrairHoraDoTimestamp(val: string | undefined | null): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (!cleaned) return null;
  const m = cleaned.match(/(\d{1,2}):(\d{2}):(\d{2})\s*$/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3]}`;
}

/** DATE aceita AAAA/MM/DD ou DD/MM/AAAA (com "/" ou "-"), detectado pelo segmento de 4 dígitos. */
function parseDataFlexivel(val: string | undefined | null): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  const m = cleaned.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (!m) return null;

  const [, p1, p2, p3] = m;
  let year: string, month: string, day: string;
  if (p1.length === 4) {
    year = p1;
    month = p2;
    day = p3;
  } else if (p3.length === 4) {
    day = p1;
    month = p2;
    year = p3;
  } else {
    return null;
  }

  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseTempoLogadoCsv(csvText: string): ParseTempoLogadoCsvResult {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    console.error("[parse-tempo-logado-csv] erro no Papa.parse:", parsed.errors);
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    return { linhas: [], lidas: 0, validas: 0, puladas: 0 };
  }

  const normalizedHeaders = rows[0].map(normalizeHeader);
  const colIndex = (name: string) => normalizedHeaders.indexOf(name);

  const missing = REQUIRED_COLUMNS.filter((c) => colIndex(c) === -1);
  if (missing.length > 0) {
    throw new Error(
      `[parse-tempo-logado-csv] colunas obrigatórias não encontradas no CSV: ${missing.join(", ")}`,
    );
  }

  const idxAgentName = colIndex("AGENT NAME");
  const idxAgent = colIndex("AGENT");
  const idxDate = colIndex("DATE");
  const idxLoginTime = colIndex("LOGIN TIME");
  const idxAgentStateTime = colIndex("AGENT STATE TIME");
  const idxReasonCode = colIndex("REASON CODE");
  const idxState = colIndex("STATE");
  const idxLoginTimestamp = colIndex("LOGIN TIMESTAMP");
  const idxLogoutTimestamp = colIndex("LOGOUT TIMESTAMP");

  const linhas: TempoLogadoCsvRow[] = [];
  let lidas = 0;
  let validas = 0;
  let puladas = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    lidas++;

    const agentName = (row[idxAgentName] ?? "").trim();
    const agentEmail = (row[idxAgent] ?? "").trim();
    const state = (row[idxState] ?? "").trim();
    const dataRef = parseDataFlexivel(row[idxDate]);

    if (!agentName || !agentEmail || !state || !dataRef) {
      puladas++;
      continue;
    }

    const agentUser = agentEmail.split("@")[0]?.trim().toLowerCase() ?? "";
    if (!agentUser) {
      puladas++;
      continue;
    }

    const reasonCodeRaw = (row[idxReasonCode] ?? "").trim();
    const isLogin = state.toLowerCase() === "login";

    linhas.push({
      agent_user: agentUser,
      agent_email: agentEmail,
      agent_name: agentName,
      data_ref: dataRef,
      state,
      reason_code: reasonCodeRaw || null,
      login_time_seg: parseHoraParaSegundos(row[idxLoginTime]),
      agent_state_time_seg: parseHoraParaSegundos(row[idxAgentStateTime]),
      login_timestamp_hora: isLogin ? extrairHoraDoTimestamp(row[idxLoginTimestamp]) : null,
      logout_timestamp_hora: isLogin ? extrairHoraDoTimestamp(row[idxLogoutTimestamp]) : null,
    });
    validas++;
  }

  return { linhas, lidas, validas, puladas };
}
