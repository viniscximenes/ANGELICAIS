import Papa from "papaparse";

import { linhasValidasDeRows } from "./parse-tma";
import { bucketDaSkill, zeroSkillBuckets, type SkillBucket } from "./skills-retencao";
import type { TmaRosterRow } from "./actions/get-tma-roster-action";

export type AgregadoTmaPayload = {
  gestorId: string;
  operatorEmail: string;
  qtd: number;
  talkTotal: number;
  acwTotal: number;
  buckets: Record<SkillBucket, number>;
};

export type DetalheTmaPayload = {
  gestorId: string;
  operatorEmail: string;
  callId: string | null;
  callSegmentId: string | null;
  hora: string | null;
  ani: string | null;
  skill: string;
  talkSegundos: number;
  acwSegundos: number;
};

export type UploadTmaPayload = {
  linhasCsv: number;
  atendimentosValidos: number;
  semMatch: number;
  colisoes: number;
  agregados: AgregadoTmaPayload[];
  detalhes: DetalheTmaPayload[];
};

/**
 * Parseia o CSV inteiramente NO NAVEGADOR (Web Worker do papaparse) e já
 * resolve o matching por parte local + a agregação por operador — o
 * resultado enviado ao servidor é só esse payload pequeno (agregado +
 * detalhado), nunca o CSV bruto (~10MB em dia cheio). Ver spec: enviar o
 * arquivo inteiro pra uma Server Action/Route estoura o limite de payload
 * (413 em produção) — o parse tem que ficar 100% client-side.
 */
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

export async function parseTmaNoClient(
  file: File,
  roster: TmaRosterRow[],
): Promise<UploadTmaPayload> {
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

  // parte local (lowercase) -> lista de {gestorId, operadorEmail} cadastrados.
  // Mais de um operador distinto com a mesma parte local = colisão (defensivo).
  const porParteLocal = new Map<string, { gestorId: string; operadorEmail: string }[]>();
  for (const r of roster) {
    const email = r.operadorEmail.trim().toLowerCase();
    const parteLocal = email.split("@")[0];
    const lista = porParteLocal.get(parteLocal) ?? [];
    if (!lista.some((x) => x.operadorEmail === email)) {
      lista.push({ gestorId: r.gestorId, operadorEmail: email });
    }
    porParteLocal.set(parteLocal, lista);
  }

  const porOperador = new Map<string, AgregadoTmaPayload>();
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

    const { gestorId, operadorEmail } = candidatos[0];

    let agg = porOperador.get(operadorEmail);
    if (!agg) {
      agg = {
        gestorId,
        operatorEmail: operadorEmail,
        qtd: 0,
        talkTotal: 0,
        acwTotal: 0,
        buckets: zeroSkillBuckets(),
      };
      porOperador.set(operadorEmail, agg);
    }
    agg.qtd += 1;
    agg.talkTotal += linha.talkSegundos;
    agg.acwTotal += linha.acwSegundos;
    const bucket = bucketDaSkill(linha.skill);
    if (bucket) agg.buckets[bucket] += 1;

    detalhes.push({
      gestorId,
      operatorEmail: operadorEmail,
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
    agregados: Array.from(porOperador.values()),
    detalhes,
  };
}
