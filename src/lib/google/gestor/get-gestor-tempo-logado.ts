import { getSheetsClient } from "../sheets-client";
import type {
  GestorTempoLogadoData,
  GestorTempoLogadoLinha,
  StatusPresenca,
} from "./tempo-logado-types";
import { META_TEMPO_LOGADO_SEGUNDOS } from "./tempo-logado-types";

/**
 * Converte "HH:MM:SS" em segundos. Retorna 0 para entradas inválidas/vazias.
 */
function parseTempoParaSegundos(str: unknown): number {
  if (!str) return 0;
  const s = String(str).trim();
  const partes = s.split(":");
  if (partes.length < 2) return 0;
  const h = parseInt(partes[0] ?? "0", 10);
  const m = parseInt(partes[1] ?? "0", 10);
  const sec = parseInt(partes[2] ?? "0", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(sec)) return 0;
  return h * 3600 + m * 60 + sec;
}

/**
 * Extrai "HH:MM:SS" de uma string de data completa como
 * "Tue, 26 May 2026 14:04:52". Retorna null se não houver match.
 */
function extrairHoraDeData(str: unknown): string | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;
  const match = s.match(/\d{2}:\d{2}:\d{2}/);
  return match ? match[0] : null;
}

/**
 * Determina o StatusPresenca com base nas colunas F (login) e G (logout).
 *
 * Regra-chave: LOGIN (F) é o indicador primário de presença. Sem login o
 * operador é "ausente" independente do que estiver em G — incluindo o caso
 * F vazio + G="sem dados", que a planilha grava para slots de linha vazios
 * e não indica presença real.
 */
function determinarStatus(
  horaLoginRaw: string,
  horaLogoutRaw: string,
): StatusPresenca {
  const login = horaLoginRaw.trim();
  const logout = horaLogoutRaw.trim().toLowerCase();

  if (!login) return "ausente";
  if (logout === "sem dados") return "ainda_logado";
  return "completo";
}

/**
 * Lê a guia de tempo logado do gestor (ex: "ANA ANGELICA2") e devolve a
 * estrutura da equipe. A guia segue o mapeamento de tempo-logado-types.ts.
 *
 * Nome de guia com espaço exige aspas simples no A1 notation.
 * Lê A2:G100 — colunas A–G (D é lido mas descartado, não exposto nos tipos).
 */
export async function fetchGestorTempoLogado(
  guia: string,
): Promise<GestorTempoLogadoData> {
  const { sheets, sheetId } = getSheetsClient();

  let response;
  try {
    response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: [
        "'BASE - 2'!L2",
        `'${guia}'!A2:G100`,
      ],
    });
  } catch (err) {
    console.error(`[fetchGestorTempoLogado] Erro ao ler guia "${guia}":`, err);
    return { operadores: [], horaReport: "—" };
  }

  const valueRanges = response.data.valueRanges ?? [];
  const horaCell = valueRanges[0]?.values?.[0]?.[0];
  const horaReport = horaCell ? String(horaCell).trim() : "—";
  const rows = valueRanges[1]?.values ?? [];

  const operadores: GestorTempoLogadoLinha[] = rows
    .filter((row) => String(row[0] ?? "").trim())
    .map((row) => {
      const email = String(row[0] ?? "").trim().toLowerCase();
      const gestor = String(row[1] ?? "").trim();
      const tempoLogado = String(row[2] ?? "").trim();
      // row[3] = coluna D (tempo que falta) — lido mas não exposto
      const logoutEstimado = String(row[4] ?? "").trim();
      const loginRaw = String(row[5] ?? "").trim();
      const logoutRaw = String(row[6] ?? "").trim();

      const tempoLogadoSegundos = parseTempoParaSegundos(tempoLogado);
      const cumpriuMeta = tempoLogadoSegundos >= META_TEMPO_LOGADO_SEGUNDOS;
      const horaLogin = extrairHoraDeData(loginRaw);
      const status = determinarStatus(loginRaw, logoutRaw);
      const horaLogout =
        logoutRaw.toLowerCase() === "sem dados" || !logoutRaw
          ? null
          : logoutRaw;

      return {
        email,
        gestor,
        tempoLogado,
        tempoLogadoSegundos,
        cumpriuMeta,
        logoutEstimado,
        horaLogin,
        horaLogout,
        status,
      };
    });

  return { operadores, horaReport };
}
