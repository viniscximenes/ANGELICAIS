import Papa from "papaparse";

export type RetencaoAtendimentoInput = {
  cod_air: string | null;
  data_criacao: string | null; // YYYY-MM-DD
  cod_sydle: string | null;
  status_contrato: string | null;
  status_retencao: string | null;
  status_hora: string | null; // ISO string with offset
  hora_bucket: number | null; // 0-23
  ult_equipe: string | null;
  motivo: string | null;
  submotivo: string | null;
  primeiro_nivel: string | null;
  data_ref: string | null; // YYYY-MM-DD
  usuario_nome: string | null;
  usuario_login: string | null;
  unidade_nome: string | null;
  unidade_sigla: string | null;
  marca: string | null;
  foi_cancelamento: boolean;
  comprador_nome: string | null;
};

type ParseResult = {
  linhas: RetencaoAtendimentoInput[];
  lidas: number;
  validas: number;
  puladas: number;
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s+/g, " ");
}

function parseDateBR(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  const year = m[3];
  return `${year}-${month}-${day}`;
}

function parseTimestampBR(val: string | null | undefined): { status_hora: string | null; hora_bucket: number | null } {
  if (!val) return { status_hora: null, hora_bucket: null };
  const cleaned = val.trim();
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return { status_hora: null, hora_bucket: null };
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  const year = m[3];
  const hour = m[4].padStart(2, "0");
  const min = m[5];
  const sec = m[6] || "00";
  
  const isoString = `${year}-${month}-${day}T${hour}:${min}:${sec}-03:00`;
  const hora_bucket = parseInt(hour, 10);
  
  return { status_hora: isoString, hora_bucket };
}

function parseBoolean(val: string | null | undefined): boolean {
  if (!val) return false;
  const cleaned = val.trim().toLowerCase();
  return cleaned === "verdadeiro" || cleaned === "true" || cleaned === "sim" || cleaned === "1";
}

const COLUMN_MAP: Record<string, keyof Omit<RetencaoAtendimentoInput, "foi_cancelamento" | "status_hora" | "hora_bucket" | "data_criacao" | "data_ref">> = {
  "COD_AIR": "cod_air",
  "COD_SYDLE": "cod_sydle",
  "STATUS_CONTRATO": "status_contrato",
  "STATUS_RETENCAO": "status_retencao",
  "ULT_EQUIPE_ATENDIMENTO": "ult_equipe",
  "MOTIVO": "motivo",
  "SUBMOTIVO": "submotivo",
  "PRIMEIRO_NIVEL": "primeiro_nivel",
  "USUARIO > NOME": "usuario_nome",
  "USUARIO > LOGIN": "usuario_login",
  "UNIDADE DE ATENDIMENTO > NOME": "unidade_nome",
  "UNIDADE DE ATENDIMENTO > SIGLA": "unidade_sigla",
  "UNIDADE DE ATENDIMENTO > MARCA ASSOCIADA": "marca",
  "CONTRATO > COMPRADOR > NOME": "comprador_nome",
};

export function parseBaseRetencao(csvText: string): ParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error("[parse-base-retencao] erro no Papa.parse:", parsed.errors);
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    return { linhas: [], lidas: 0, validas: 0, puladas: 0 };
  }

  const rawHeaders = rows[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const colAirIndex = normalizedHeaders.indexOf("COD_AIR");
  const statusHoraIndex = normalizedHeaders.indexOf("STATUS_HORA");
  const dataCriacaoIndex = normalizedHeaders.indexOf("DATA DE CRIACAO (DIA)");
  const dataIndex = normalizedHeaders.indexOf("DATA");
  const foiCancelamentoIndex = normalizedHeaders.indexOf("FOI_CANCELAMENTO");

  const mappedIndexes = normalizedHeaders.map((header) => {
    const key = COLUMN_MAP[header];
    return key || null;
  });

  const linhas: RetencaoAtendimentoInput[] = [];
  let lidas = 0;
  let validas = 0;
  let puladas = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    lidas++;

    const codAir = colAirIndex !== -1 ? (row[colAirIndex] || "").trim() : "";
    const statusHoraRaw = statusHoraIndex !== -1 ? (row[statusHoraIndex] || "").trim() : "";

    if (!codAir || !statusHoraRaw) {
      puladas++;
      continue;
    }

    const { status_hora, hora_bucket } = parseTimestampBR(statusHoraRaw);
    if (!status_hora) {
      puladas++;
      continue;
    }

    const dataCriacaoRaw = dataCriacaoIndex !== -1 ? row[dataCriacaoIndex] : null;
    const dataRaw = dataIndex !== -1 ? row[dataIndex] : null;

    const data_criacao = parseDateBR(dataCriacaoRaw);
    const data_ref = parseDateBR(dataRaw);

    const foiCancelamentoRaw = foiCancelamentoIndex !== -1 ? row[foiCancelamentoIndex] : null;
    const foi_cancelamento = parseBoolean(foiCancelamentoRaw);

    const inputRow: RetencaoAtendimentoInput = {
      cod_air: codAir,
      data_criacao,
      cod_sydle: null,
      status_contrato: null,
      status_retencao: null,
      status_hora,
      hora_bucket,
      ult_equipe: null,
      motivo: null,
      submotivo: null,
      primeiro_nivel: null,
      data_ref,
      usuario_nome: null,
      usuario_login: null,
      unidade_nome: null,
      unidade_sigla: null,
      marca: null,
      foi_cancelamento,
      comprador_nome: null,
    };

    normalizedHeaders.forEach((_, index) => {
      const dbKey = mappedIndexes[index];
      if (dbKey) {
        const val = (row[index] || "").trim();
        (inputRow as Record<string, unknown>)[dbKey] = val || null;
      }
    });

    linhas.push(inputRow);
    validas++;
  }

  return { linhas, lidas, validas, puladas };
}
