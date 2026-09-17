import Papa from "papaparse";

import { isSkillRetencao } from "./skills-retencao";

export type TmaLinhaValida = {
  emailLocal: string; // parte antes do @ de CALLED PARTY, lowercase
  skill: string; // valor original da coluna SKILL (não normalizado)
  callId: string | null;
  callSegmentId: string | null;
  hora: string | null; // TIME, "HH:MM:SS"
  ani: string | null;
  talkSegundos: number; // sempre >= 1 (linhas com TALK TIME vazio já foram descartadas)
  acwSegundos: number; // 0 quando ACW vazio
};

type ParseTmaResult = {
  linhas: TmaLinhaValida[];
  lidas: number;
  validas: number;
  puladas: number;
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const SEGMENT_TYPES_EXCLUIDOS = new Set(["silent monitoring", "barge in"]);

/** "HH:MM:SS" -> segundos. Vazio/nulo/inválido -> null (nunca 0 — vazio não é zero). */
function hhmmssParaSegundosOuNull(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (!cleaned) return null;
  const m = cleaned.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
}

/**
 * Parseia o relatório de voz (CDR) — uma linha por segmento de ligação.
 * Ver spec da feature TMA pra regra completa de linha válida.
 */
export function parseTma(csvText: string): ParseTmaResult {
  const parsed = Papa.parse<string[]>(csvText, {
    delimiter: ";",
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error("[parse-tma] erro no Papa.parse:", parsed.errors);
  }

  const rows = parsed.data;
  if (rows.length < 2) {
    return { linhas: [], lidas: 0, validas: 0, puladas: 0 };
  }

  const headers = rows[0].map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);

  const iCalledParty = idx("CALLED PARTY");
  const iSkill = idx("SKILL");
  const iCallId = idx("CALL ID");
  const iCallSegmentId = idx("CALL SEGMENT ID");
  const iTime = idx("TIME");
  const iAni = idx("ANI");
  const iTalkTime = idx("TALK TIME");
  const iAcwTime = idx("AFTER CALL WORK TIME");
  const iSegmentType = idx("SEGMENT TYPE");
  const iCallType = idx("CALL TYPE");

  const linhas: TmaLinhaValida[] = [];
  let lidas = 0;
  let validas = 0;
  let puladas = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    lidas++;

    const calledParty = (iCalledParty !== -1 ? row[iCalledParty] : "")?.trim() ?? "";
    const atIndex = calledParty.indexOf("@");
    if (atIndex <= 0) {
      puladas++;
      continue;
    }

    const skillRaw = (iSkill !== -1 ? row[iSkill] : "")?.trim() ?? "";
    if (!isSkillRetencao(skillRaw)) {
      puladas++;
      continue;
    }

    const talkSegundos = hhmmssParaSegundosOuNull(iTalkTime !== -1 ? row[iTalkTime] : null);
    if (talkSegundos === null || talkSegundos < 1) {
      // TALK TIME vazio (ou inválido) descarta a linha inteira — nunca conta como zero.
      puladas++;
      continue;
    }

    const segmentTypeRaw = (iSegmentType !== -1 ? row[iSegmentType] : "")?.trim() ?? "";
    if (SEGMENT_TYPES_EXCLUIDOS.has(segmentTypeRaw.toLowerCase())) {
      puladas++;
      continue;
    }

    const callTypeRaw = (iCallType !== -1 ? row[iCallType] : "")?.trim() ?? "";
    if (callTypeRaw && callTypeRaw.toLowerCase() !== "inbound") {
      // Proteção pra arquivos futuros — o arquivo de amostra vem 100% Inbound.
      puladas++;
      continue;
    }

    const acwSegundos = hhmmssParaSegundosOuNull(iAcwTime !== -1 ? row[iAcwTime] : null) ?? 0;

    linhas.push({
      emailLocal: calledParty.slice(0, atIndex).toLowerCase(),
      skill: skillRaw,
      callId: iCallId !== -1 ? (row[iCallId]?.trim() || null) : null,
      callSegmentId: iCallSegmentId !== -1 ? (row[iCallSegmentId]?.trim() || null) : null,
      hora: iTime !== -1 ? (row[iTime]?.trim() || null) : null,
      ani: iAni !== -1 ? (row[iAni]?.trim() || null) : null,
      talkSegundos,
      acwSegundos,
    });
    validas++;
  }

  return { linhas, lidas, validas, puladas };
}
