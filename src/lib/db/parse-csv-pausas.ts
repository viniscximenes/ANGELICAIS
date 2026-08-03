import Papa from "papaparse";

export type PausaCsvRow = {
  agent_name: string;
  agent_email: string;
  agent_user: string;
  data_ref: string; // YYYY-MM-DD
  state: string;
  reason_code: string | null;
  login_time_seg: number | null;
  agent_state_time_seg: number | null;
};

export type EncodingDetectado =
  | "utf-8"
  | "utf-8-bom"
  | "windows-1252"
  | "utf-8-com-mojibake-corrigido";

export type ParseCsvPausasResult = {
  linhas: PausaCsvRow[];
  lidas: number;
  validas: number;
  puladas: number;
  encodingDetectado: EncodingDetectado;
};

const REQUIRED_COLUMNS = [
  "AGENT NAME",
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

/**
 * Tabela de bytes CP1252 (0-255) construída via TextDecoder nativo, usada
 * para reverter mojibake sem precisar hardcodar a tabela de code points do
 * bloco 0x80-0x9F (que diverge da Latin-1 pura).
 */
const CP1252_CHAR_TO_BYTE = new Map<string, number>();
for (let b = 0; b < 256; b++) {
  const ch = new TextDecoder("windows-1252").decode(new Uint8Array([b]));
  CP1252_CHAR_TO_BYTE.set(ch, b);
}

/**
 * Corrige o mojibake clássico de "UTF-8 relido como Windows-1252/Latin-1"
 * (ex: "AzerÃªdo" -> "Azerêdo", "GONÃ‡ALVES" -> "GONÇALVES"). Reconstrói os
 * bytes originais caractere a caractere via a tabela CP1252 e re-decodifica
 * como UTF-8. Se qualquer caractere não existir no CP1252, ou o resultado
 * não for UTF-8 válido, considera que não é esse tipo de mojibake e devolve
 * o texto original.
 */
function corrigirMojibake(text: string): { texto: string; corrigiu: boolean } {
  if (!/[ÃÂ]/.test(text)) {
    return { texto: text, corrigiu: false };
  }

  const bytes: number[] = [];
  for (const ch of text) {
    const b = CP1252_CHAR_TO_BYTE.get(ch);
    if (b === undefined) {
      return { texto: text, corrigiu: false };
    }
    bytes.push(b);
  }

  try {
    const fixed = new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(bytes),
    );
    return { texto: fixed, corrigiu: fixed !== text };
  } catch {
    return { texto: text, corrigiu: false };
  }
}

function decodeCsvBytes(input: ArrayBuffer | Uint8Array): {
  texto: string;
  encoding: EncodingDetectado;
} {
  const bytes =
    input instanceof Uint8Array ? input : new Uint8Array(input);

  // BOM UTF-8 (EF BB BF)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const texto = new TextDecoder("utf-8").decode(bytes.slice(3));
    const { texto: corrigido, corrigiu } = corrigirMojibake(texto);
    return {
      texto: corrigido,
      encoding: corrigiu ? "utf-8-com-mojibake-corrigido" : "utf-8-bom",
    };
  }

  let texto: string;
  let encoding: EncodingDetectado;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    encoding = "utf-8";
  } catch {
    // UTF-8 estrito falhou (bytes inválidos) — arquivo realmente em
    // Latin-1/Windows-1252 de origem.
    texto = new TextDecoder("windows-1252").decode(bytes);
    encoding = "windows-1252";
  }

  const { texto: corrigido, corrigiu } = corrigirMojibake(texto);
  if (corrigiu) {
    return { texto: corrigido, encoding: "utf-8-com-mojibake-corrigido" };
  }
  return { texto, encoding };
}

/**
 * HH:MM:SS -> segundos. Vazio/inválido -> null.
 */
function parseHoraParaSegundos(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (!cleaned) return null;
  const m = cleaned.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  return h * 3600 + min * 60 + s;
}

/**
 * Converte a coluna DATE para YYYY-MM-DD. Aceita tanto DD/MM/AAAA quanto
 * AAAA/MM/DD (ou com "-"), detectando pelo segmento de 4 dígitos — o CSV
 * real fornecido usa AAAA/MM/DD, mas exports diferentes podem variar.
 */
function parseDataFlexivel(val: string | undefined | null): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  const m = cleaned.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (!m) return null;

  const [, p1, p2, p3] = m;
  let year: string, month: string, day: string;
  if (p1.length === 4) {
    // AAAA/MM/DD
    year = p1;
    month = p2;
    day = p3;
  } else if (p3.length === 4) {
    // DD/MM/AAAA
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

export function parseCsvPausas(
  input: ArrayBuffer | Uint8Array,
): ParseCsvPausasResult {
  const { texto, encoding } = decodeCsvBytes(input);

  const parsed = Papa.parse<string[]>(texto, {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error("[parse-csv-pausas] erro no Papa.parse:", parsed.errors);
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    return {
      linhas: [],
      lidas: 0,
      validas: 0,
      puladas: 0,
      encodingDetectado: encoding,
    };
  }

  const rawHeaders = rows[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const colIndex = (name: string) => normalizedHeaders.indexOf(name);

  const missing = REQUIRED_COLUMNS.filter((c) => colIndex(c) === -1);
  if (missing.length > 0) {
    throw new Error(
      `[parse-csv-pausas] colunas obrigatórias não encontradas no CSV: ${missing.join(", ")}`,
    );
  }

  const idxAgentName = colIndex("AGENT NAME");
  const idxAgent = colIndex("AGENT");
  const idxDate = colIndex("DATE");
  const idxLoginTime = colIndex("LOGIN TIME");
  const idxAgentStateTime = colIndex("AGENT STATE TIME");
  const idxReasonCode = colIndex("REASON CODE");
  const idxState = colIndex("STATE");

  const linhas: PausaCsvRow[] = [];
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

    linhas.push({
      agent_name: agentName,
      agent_email: agentEmail,
      agent_user: agentUser,
      data_ref: dataRef,
      state,
      reason_code: reasonCodeRaw || null,
      login_time_seg: parseHoraParaSegundos(row[idxLoginTime]),
      agent_state_time_seg: parseHoraParaSegundos(row[idxAgentStateTime]),
    });
    validas++;
  }

  return {
    linhas,
    lidas,
    validas,
    puladas,
    encodingDetectado: encoding,
  };
}
