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
  /**
   * true quando o Papa.parse acusou erro de formato (aspas sem fechar,
   * delimitador não detectado...). O upload recusa o arquivo — antes essa
   * checagem só existia no navegador (UploadDropzone parseava o CSV inteiro
   * só pra isso).
   */
  formatoInvalido: boolean;
  /** Colunas obrigatórias (COLUNAS_OBRIGATORIAS) ausentes no cabeçalho. */
  colunasFaltando: string[];
  /**
   * Colunas lidas pelo parser que aparecem mais de uma vez no cabeçalho.
   * Recusa o arquivo: a validação olhava a 1ª ocorrência e o mapeamento
   * gravava a última (auditoria 2026-10-07 — um "USUARIO > LOGIN" duplicado
   * e vazio passava na validação e gravava login null).
   */
  colunasDuplicadas: string[];
  /**
   * Linhas recusadas, com o número da linha no arquivo (cabeçalho = 1) e o
   * motivo. O upload só grava se esta lista vier vazia: a RPC substitui a
   * base global inteira, então descartar linhas em silêncio trocaria a base
   * por um lote incompleto.
   */
  linhasInvalidas: { linha: number; motivo: string }[];
};

/**
 * Colunas sem as quais a classificação/agregação fica errada:
 *  - COD_AIR / STATUS_HORA / USUARIO > LOGIN: chave da dedupe e do operador;
 *  - FOI_CANCELAMENTO / STATUS_RETENCAO: classificação retido/cancelado/abortado
 *    (sem FOI_CANCELAMENTO, todo cancelamento virava retenção);
 *  - MOTIVO: buckets de motivo do D-1.
 * DATA e DATA DE CRIACAO (DIA) ficam de fora: a base real não as preenche.
 */
const COLUNAS_OBRIGATORIAS = [
  "COD_AIR",
  "STATUS_HORA",
  "FOI_CANCELAMENTO",
  "STATUS_RETENCAO",
  "USUARIO > LOGIN",
  "MOTIVO",
] as const;

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

const VALORES_VERDADEIRO = new Set(["verdadeiro", "true", "sim", "s", "1", "v", "yes"]);
const VALORES_FALSO = new Set(["falso", "false", "nao", "não", "n", "0", "f", "no"]);

/** null = vazio ou valor desconhecido (linha inválida, não vira `false`). */
function parseBoolean(val: string | null | undefined): boolean | null {
  const cleaned = (val ?? "").trim().toLowerCase();
  if (VALORES_VERDADEIRO.has(cleaned)) return true;
  if (VALORES_FALSO.has(cleaned)) return false;
  return null;
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

/** Todas as colunas que o parser lê — nenhuma pode vir duplicada no cabeçalho. */
const COLUNAS_LIDAS = new Set<string>([
  ...COLUNAS_OBRIGATORIAS,
  ...Object.keys(COLUMN_MAP),
  "DATA",
  "DATA DE CRIACAO (DIA)",
]);

export function parseBaseRetencao(csvText: string): ParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  const vazio = {
    linhas: [],
    lidas: 0,
    validas: 0,
    puladas: 0,
    formatoInvalido: false,
    colunasFaltando: [],
    colunasDuplicadas: [],
    linhasInvalidas: [],
  };

  if (parsed.errors.length > 0) {
    console.error("[parse-base-retencao] erro no Papa.parse:", parsed.errors);
    return { ...vazio, formatoInvalido: true };
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    return vazio;
  }

  const rawHeaders = rows[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const colunasFaltando = COLUNAS_OBRIGATORIAS.filter((c) => !normalizedHeaders.includes(c));
  if (colunasFaltando.length > 0) {
    return { ...vazio, colunasFaltando };
  }

  const colunasDuplicadas = [...COLUNAS_LIDAS].filter(
    (c) => normalizedHeaders.filter((h) => h === c).length > 1,
  );
  if (colunasDuplicadas.length > 0) {
    return { ...vazio, colunasDuplicadas };
  }

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
  const linhasInvalidas: { linha: number; motivo: string }[] = [];
  let lidas = 0;
  let validas = 0;
  let puladas = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    lidas++;
    // Número da linha no arquivo, como o usuário vê no Excel (cabeçalho = 1).
    const numeroLinha = i + 1;
    const recusar = (motivo: string) => {
      puladas++;
      linhasInvalidas.push({ linha: numeroLinha, motivo });
    };

    const codAir = (row[colAirIndex] || "").trim();
    const statusHoraRaw = (row[statusHoraIndex] || "").trim();

    if (!codAir) {
      recusar("COD_AIR vazio");
      continue;
    }

    const { status_hora, hora_bucket } = parseTimestampBR(statusHoraRaw);
    if (!status_hora) {
      recusar(statusHoraRaw ? `STATUS_HORA inválido ("${statusHoraRaw}")` : "STATUS_HORA vazio");
      continue;
    }

    const foiCancelamentoRaw = (row[foiCancelamentoIndex] || "").trim();
    const foi_cancelamento = parseBoolean(foiCancelamentoRaw);
    if (foi_cancelamento === null) {
      recusar(
        foiCancelamentoRaw
          ? `FOI_CANCELAMENTO inválido ("${foiCancelamentoRaw}")`
          : "FOI_CANCELAMENTO vazio",
      );
      continue;
    }

    const dataCriacaoRaw = dataCriacaoIndex !== -1 ? row[dataCriacaoIndex] : null;
    const dataRaw = dataIndex !== -1 ? row[dataIndex] : null;

    const data_criacao = parseDateBR(dataCriacaoRaw);
    const data_ref = parseDateBR(dataRaw);

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

    // Login em minúsculas já na gravação: as consultas do Analítico filtram
    // com IN (variantes minúsculas, comparação exata). Login em caixa alta
    // no CSV aparecia na tabela principal (que normaliza) e sumia do Analítico.
    if (inputRow.usuario_login) {
      inputRow.usuario_login = inputRow.usuario_login.toLowerCase();
    }

    // Obrigatórios conferidos no VALOR FINAL da linha (o que vai para o
    // banco), não por um índice à parte — assim validação e gravação nunca
    // olham colunas diferentes.
    if (!inputRow.cod_air) {
      recusar("COD_AIR vazio");
      continue;
    }
    if (!inputRow.usuario_login) {
      recusar("USUARIO > LOGIN vazio");
      continue;
    }
    if (!inputRow.status_retencao) {
      recusar("STATUS_RETENCAO vazio");
      continue;
    }

    linhas.push(inputRow);
    validas++;
  }

  return {
    linhas,
    lidas,
    validas,
    puladas,
    formatoInvalido: false,
    colunasFaltando: [],
    colunasDuplicadas: [],
    linhasInvalidas,
  };
}
