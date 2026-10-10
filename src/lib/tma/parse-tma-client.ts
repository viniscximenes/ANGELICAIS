import Papa from "papaparse";

import { diasDistintosOrdenados } from "@/lib/utils/parse-data-flexivel";

import { linhasValidasDeRows, type TmaLinhaValida } from "./parse-tma";
import type { TmaRosterRow } from "./actions/get-tma-roster-action";

export type DetalheTmaPayload = {
  operatorEmail: string;
  callId: string | null;
  callSegmentId: string | null;
  hora: string | null;
  ani: string | null;
  skill: string;
  talkSegundos: number;
  acwSegundos: number;
};

/**
 * Só os atendimentos — o agregado por operador e o gestor_id de cada um são
 * calculados no servidor (upload-tma-action.ts) a partir do roster do banco,
 * nunca confiados ao que vem daqui.
 */
export type UploadTmaPayload = {
  linhasCsv: number;
  atendimentosValidos: number;
  semMatch: number;
  colisoes: number;
  detalhes: DetalheTmaPayload[];
  /** Dias distintos (YYYY-MM-DD) da coluna DATE das linhas válidas — cabeçalho "base do dia". */
  datasBase: string[];
};

/** Detecta BOM UTF-8 ou decodifica como UTF-8; cai pra windows-1252 (latin1) se inválido. */
async function detectarEncoding(file: File): Promise<"utf-8" | "windows-1252"> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) return "utf-8";
  try {
    const sample = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return "utf-8";
  } catch {
    return "windows-1252";
  }
}

/** Linhas válidas do CSV (regra de parse-tma.ts) + total de linhas lidas. */
export type LeituraTmaCsv = { linhas: TmaLinhaValida[]; lidas: number };

/**
 * Parseia o CSV inteiramente NO NAVEGADOR (Web Worker do papaparse) — o que
 * vai ao servidor é só a lista de atendimentos válidos (montarPayloadTma),
 * nunca o CSV bruto (~10MB em dia cheio). Ver spec: enviar o arquivo
 * inteiro pra uma Server Action/Route estoura o limite de payload (413 em
 * produção) — o parse tem que ficar 100% client-side.
 */
export async function lerCsvTma(file: File): Promise<LeituraTmaCsv> {
  const encoding = await detectarEncoding(file);

  const rows = await new Promise<string[][]>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      delimiter: ";",
      skipEmptyLines: true,
      worker: true,
      encoding,
      complete: (results) => resolve(results.data),
      error: (err: Error) => reject(err),
    });
  });

  const { linhas, lidas } = linhasValidasDeRows(rows);
  return { linhas, lidas };
}

/** Partes locais distintas do CSV — o que getTmaRosterAction recebe pra devolver só os operadores do arquivo. */
export function partesLocaisDoCsv(leitura: LeituraTmaCsv): string[] {
  return Array.from(new Set(leitura.linhas.map((l) => l.emailLocal)));
}

/**
 * Matching por parte local contra o roster devolvido por getTmaRosterAction
 * (só os operadores do arquivo) e montagem do payload do upload.
 */
export function montarPayloadTma(leitura: LeituraTmaCsv, roster: TmaRosterRow[]): UploadTmaPayload {
  const { linhas, lidas } = leitura;

  // parte local (lowercase) -> e-mails cadastrados com ela. Mais de um
  // operador distinto com a mesma parte local = colisão (defensivo).
  const porParteLocal = new Map<string, string[]>();
  for (const r of roster) {
    const email = r.operadorEmail.trim().toLowerCase();
    const parteLocal = email.split("@")[0];
    const lista = porParteLocal.get(parteLocal) ?? [];
    if (!lista.includes(email)) lista.push(email);
    porParteLocal.set(parteLocal, lista);
  }

  const detalhes: DetalheTmaPayload[] = [];
  let semMatch = 0;
  let colisoes = 0;

  for (const linha of linhas) {
    const candidatos = porParteLocal.get(linha.emailLocal);
    if (!candidatos || candidatos.length === 0) {
      semMatch++;
      continue;
    }
    if (candidatos.length > 1) {
      colisoes++;
      continue;
    }

    detalhes.push({
      operatorEmail: candidatos[0],
      callId: linha.callId,
      callSegmentId: linha.callSegmentId,
      hora: linha.hora,
      ani: linha.ani,
      skill: linha.skill,
      talkSegundos: linha.talkSegundos,
      acwSegundos: linha.acwSegundos,
    });
  }

  return {
    linhasCsv: lidas,
    atendimentosValidos: linhas.length,
    semMatch,
    colisoes,
    detalhes,
    datasBase: diasDistintosOrdenados(linhas.map((l) => l.data)),
  };
}
