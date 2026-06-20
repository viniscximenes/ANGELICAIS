import { parsePercent } from "../d1/parse";
import { getSheetsClient } from "../sheets-client";
import {
  META_INDISPONIBILIDADE,
  type GestorIndispData,
  type GestorIndispLinha,
  type PausasDetalhe,
} from "./indisponibilidade-types";

function parseTempoParaSegundos(str: unknown): number {
  if (!str) return 0;
  const s = String(str).trim();
  const partes = s.split(":");
  if (partes.length < 2) return 0;
  const h = parseInt(partes[0] ?? "0", 10);
  const m = parseInt(partes[1] ?? "0", 10);
  const sec = parseInt(partes[2] ?? "0", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(sec))
    return 0;
  return h * 3600 + m * 60 + sec;
}

/** Retorna a string de tempo bruta da planilha, ou "00:00:00" se vazia. */
function rawPausa(val: unknown): string {
  if (!val) return "00:00:00";
  const s = String(val).trim();
  return s || "00:00:00";
}

function pctSobre(num: number, denom: number): number | null {
  if (denom <= 0) return null;
  return (num / denom) * 100;
}

/**
 * Lê a guia de indisponibilidade do gestor (ex: "ANA ANGELICA2") — a MESMA
 * guia do tempo logado, colunas C, I, L–AA.
 *
 * Índices 0-based (A=0):
 *   C=2  tempo logado total (denominador de NR17, particular e outras pausas)
 *   I=8  indisponibilidade % — vem pronto da planilha, não é recalculado
 *   L=11 Pausa 10       M=12 Pausa 20      N=13 Pausa Particular
 *   O=14 Mon/Taref      P=15 Tren/Reun     Q=16 Feedback
 *   R=17 Pré Pausa      S=18 Ativo         T=19 Take Blip
 *   U=20 Pausa 15       V=21 Pausa 40      W=22 Operacional
 *   X=23 E-mail         Y=24 Indisponível  Z=25 Sistema
 *   AA=26 Pausa Sem Motivo — somente exibição, excluída dos cálculos
 *   J=9  tempo indisponível — lido pelo range mas não usado nos cálculos
 */
export async function fetchGestorIndisponibilidade(
  guia: string,
): Promise<GestorIndispData> {
  const { sheets, sheetId } = getSheetsClient();

  let response;
  try {
    response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: [
        "'BASE - 2'!L2",     // hora do report (compartilhada com Tempo Logado)
        `'${guia}'!A2:AA100`,
      ],
    });
  } catch (err) {
    console.error(
      `[fetchGestorIndisponibilidade] Erro ao ler guia "${guia}":`,
      err,
    );
    return { operadores: [] };
  }

  const valueRanges = response.data.valueRanges ?? [];
  const horaCell = valueRanges[0]?.values?.[0]?.[0];
  const horaReport = horaCell ? String(horaCell).trim() : "—";
  const rows = valueRanges[1]?.values ?? [];

  const operadores: GestorIndispLinha[] = rows
    .filter((row) => String(row[0] ?? "").trim())
    .map((row) => {
      const email = String(row[0] ?? "").trim().toLowerCase();

      // Coluna I (índice 8): parsePercent devolve fração (0.123); × 100 → %
      const indispFrac = parsePercent(row[8]);
      const indisponibilidade =
        indispFrac !== null ? Math.round(indispFrac * 10000) / 100 : null;

      const cumpriuMeta =
        indisponibilidade !== null
          ? indisponibilidade < META_INDISPONIBILIDADE
          : false;

      // Coluna C (índice 2): tempo logado — denominador de todos os percentuais
      const tempoLogado = parseTempoParaSegundos(row[2]);

      // NR17: Pausa 10 (L=11) + Pausa 20 (M=12)
      const p10 = parseTempoParaSegundos(row[11]);
      const p20 = parseTempoParaSegundos(row[12]);

      // Pausa Particular: N (índice 13)
      const particular = parseTempoParaSegundos(row[13]);

      // Outras pausas: O–Z (índices 14–25) — exclui L/M/N e AA
      const outras =
        parseTempoParaSegundos(row[14]) + // O: Mon ou Taref
        parseTempoParaSegundos(row[15]) + // P: Tren ou Reun
        parseTempoParaSegundos(row[16]) + // Q: Feedback
        parseTempoParaSegundos(row[17]) + // R: Pré Pausa
        parseTempoParaSegundos(row[18]) + // S: Ativo
        parseTempoParaSegundos(row[19]) + // T: Take Blip
        parseTempoParaSegundos(row[20]) + // U: Pausa 15
        parseTempoParaSegundos(row[21]) + // V: Pausa 40
        parseTempoParaSegundos(row[22]) + // W: Operacional
        parseTempoParaSegundos(row[23]) + // X: E-mail
        parseTempoParaSegundos(row[24]) + // Y: Indisponível
        parseTempoParaSegundos(row[25]); //  Z: Sistema

      const pausas: PausasDetalhe = {
        pausa10: rawPausa(row[11]),
        pausa20: rawPausa(row[12]),
        pausaParticular: rawPausa(row[13]),
        monOuTaref: rawPausa(row[14]),
        trenOuReun: rawPausa(row[15]),
        feedback: rawPausa(row[16]),
        prePausa: rawPausa(row[17]),
        ativo: rawPausa(row[18]),
        takeBlip: rawPausa(row[19]),
        pausa15: rawPausa(row[20]),
        pausa40: rawPausa(row[21]),
        operacional: rawPausa(row[22]),
        email: rawPausa(row[23]),
        indisponivel: rawPausa(row[24]),
        sistema: rawPausa(row[25]),
        pausaSemMotivo: rawPausa(row[26]),
      };

      return {
        email,
        indisponibilidade,
        cumpriuMeta,
        nr17Pct: pctSobre(p10 + p20, tempoLogado),
        pausaParticularPct: pctSobre(particular, tempoLogado),
        outrasPausasPct: pctSobre(outras, tempoLogado),
        pausas,
      };
    });

  return { operadores, horaReport };
}
