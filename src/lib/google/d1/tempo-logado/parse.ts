/**
 * Normaliza um valor de tempo do Sheets para "HH:MM:SS".
 *
 * Aceita:
 * - String "HH:MM:SS"
 * - String "HH:MM" (adiciona :00)
 * - Número serial do Sheets (fração de dia)
 *
 * Retorna "00:00:00" se inválido, vazio ou erro do Sheets.
 */
export function parseTimeHHMMSS(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "00:00:00";
  }

  // String no formato esperado
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Detecta erros do Sheets
    if (/^#[A-Z/!?]+$/i.test(trimmed)) return "00:00:00";
    // Já está no formato HH:MM:SS
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      const [h, m, s] = trimmed.split(":");
      return `${h.padStart(2, "0")}:${m}:${s}`;
    }
    // Formato HH:MM (sem segundos) — adiciona :00
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(":");
      return `${h.padStart(2, "0")}:${m}:00`;
    }
    return "00:00:00";
  }

  // Número serial do Sheets (fração de dia)
  if (typeof value === "number" && Number.isFinite(value)) {
    const totalSeconds = Math.round(value * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return "00:00:00";
}

/**
 * Extrai HH:MM:SS de strings tipo "Tue, 12 May 2026 14:08:35".
 *
 * Retorna null se vazio. Retorna "00:00:00" se a string contiver
 * esse valor literal (operador ainda logado no caso do logout, ou
 * deslogou pontualmente).
 */
export function parseLoginLogoutTime(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Detecta erros do Sheets
  if (/^#[A-Z/!?]+$/i.test(str)) return null;

  // Procura padrão HH:MM:SS na string
  const match = str.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, h, m, s] = match;
  return `${h.padStart(2, "0")}:${m}:${s}`;
}

/**
 * Converte "HH:MM:SS" em segundos totais. Útil para comparações.
 */
export function timeToSeconds(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

/**
 * Extrai HH:MM de uma string contendo padrão H:M[:S]. Retorna null
 * se não encontrar.
 */
export function extractHHMM(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, h, m] = match;
  return `${h.padStart(2, "0")}:${m}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Retorna true se o horário de logout cair dentro de ±tolerance min
 * do horário do report. Aceita strings com HH:MM embutido (incluindo
 * "Tue, 12 May 2026 19:55:33" ou "19:55:33").
 */
export function isWithinReportWindow(
  logoutTime: string | null | undefined,
  reportTime: string | null | undefined,
  toleranceMinutes = 5,
): boolean {
  const logoutHHMM = extractHHMM(logoutTime);
  const reportHHMM = extractHHMM(reportTime);
  if (!logoutHHMM || !reportHHMM) return false;
  return (
    Math.abs(hhmmToMinutes(logoutHHMM) - hhmmToMinutes(reportHHMM)) <=
    toleranceMinutes
  );
}
