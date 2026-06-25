export type DiaInputTL = {
  tlog: string | null;   // "HH:MM:SS"
  login: string | null;  // "HH:MM"
  deslog: string | null; // "HH:MM"
};

export type DiaComputadoTL = {
  tlog: string;
  login: string;
  deslog: string;
};

export type TempoLogadoComputado = {
  dias: DiaComputadoTL[];       // índices 0-5 = seg-sáb
  consolidado: DiaComputadoTL;  // médias da semana
  diasFormatados: string[];     // ["Segunda · DD/MM", ...]
  periodo: string;              // "DD/MM a DD/MM"
};

const DIAS_NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

// Janela de login: 11:30–17:00 em minutos
const LOGIN_MIN = 11 * 60 + 30;
const LOGIN_MAX = 17 * 60;
// Janela de deslog: 18:00–23:00 em minutos
const DESLOG_MIN = 18 * 60;
const DESLOG_MAX = 23 * 60;

function parseHMS(s: string | null): number | null {
  if (!s) return null;
  const parts = s.trim().split(":").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function parseHM(s: string | null): number | null {
  if (!s) return null;
  const parts = s.trim().split(":").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return parts[0] * 60 + parts[1];
}

function formatHMS(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHM(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDDMM(month: number, day: number): string {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function addDays(y: number, mo: number, d: number, n: number) {
  const dt = new Date(y, mo - 1, d + n);
  return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
}

/**
 * Calcula médias de tempo logado, login e deslog da semana.
 * - T. Logado: média de todos os dias com dado.
 * - H. Login: média dos dias com login na janela 11:30–17:00 (atípicos ignorados).
 * - H. Deslog: média dos dias com deslog na janela 18:00–23:00 (atípicos ignorados).
 */
export function computeTempoLogado(
  inputs: DiaInputTL[],
  segundaFeira: string | null,
): TempoLogadoComputado {
  let diasFormatados: string[] = DIAS_NOMES.map((n) => n);
  let periodo = "";

  if (segundaFeira && segundaFeira.length === 10) {
    const [y, mo, d] = segundaFeira.split("-").map(Number);
    diasFormatados = DIAS_NOMES.map((nome, i) => {
      const dt = addDays(y, mo, d, i);
      return `${nome} · ${formatDDMM(dt.mo, dt.d)}`;
    });
    const sab = addDays(y, mo, d, 5);
    periodo = `${formatDDMM(mo, d)} a ${formatDDMM(sab.mo, sab.d)}`;
  }

  const padded: DiaInputTL[] = Array.from(
    { length: 6 },
    (_, i) => inputs[i] ?? { tlog: null, login: null, deslog: null },
  );

  const dias: DiaComputadoTL[] = padded.map((inp) => ({
    tlog: inp.tlog?.trim() || "—",
    login: inp.login?.trim() || "—",
    deslog: inp.deslog?.trim() || "—",
  }));

  // T. Logado médio: todos os dias com dado
  const tlogSecs = padded
    .map((d) => parseHMS(d.tlog))
    .filter((v): v is number => v !== null);
  const tlogTotal =
    tlogSecs.length > 0
      ? formatHMS(Math.round(tlogSecs.reduce((s, v) => s + v, 0) / tlogSecs.length))
      : "—";

  // H. Login médio: só janela 11:30–17:00
  const loginMins = padded
    .map((d) => parseHM(d.login))
    .filter((v): v is number => v !== null && v >= LOGIN_MIN && v <= LOGIN_MAX);
  const loginTotal =
    loginMins.length > 0
      ? formatHM(Math.round(loginMins.reduce((s, v) => s + v, 0) / loginMins.length))
      : "—";

  // H. Deslog médio: só janela 18:00–23:00
  const deslogMins = padded
    .map((d) => parseHM(d.deslog))
    .filter((v): v is number => v !== null && v >= DESLOG_MIN && v <= DESLOG_MAX);
  const deslogTotal =
    deslogMins.length > 0
      ? formatHM(Math.round(deslogMins.reduce((s, v) => s + v, 0) / deslogMins.length))
      : "—";

  return {
    dias,
    consolidado: { tlog: tlogTotal, login: loginTotal, deslog: deslogTotal },
    diasFormatados,
    periodo,
  };
}
