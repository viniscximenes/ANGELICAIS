import type { PausaProgramadaRow } from "./types";

const TIME_LIKE = /^\d{1,2}:\d{2}/;

export type ParsePausasResult = {
  linhas: PausaProgramadaRow[];
  ignoradas: number;
};

function normalizarEmail(agente: string): string {
  const v = agente.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@alloha.com`;
}

/**
 * Parseia a colagem TSV (Ctrl+V da planilha de escala) em linhas de
 * PausaProgramadaRow. Colunas fixas, separadas por TAB:
 *   Agente · Célula · Login · Logout · Descanso 1 · Pausa 20 · Descanso 2
 *
 * A 1ª linha é tratada como cabeçalho e descartada — a menos que a coluna
 * "Login" dela já pareça um horário (HH:MM...), sinal de que o ADM colou só
 * os dados, sem cabeçalho.
 */
export function parsePausasClipboard(text: string): ParsePausasResult {
  const linhasBrutas = text
    .split(/\r\n|\r|\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");

  if (linhasBrutas.length === 0) return { linhas: [], ignoradas: 0 };

  const primeiraCols = linhasBrutas[0].split("\t");
  const primeiraPareceHeader = !TIME_LIKE.test((primeiraCols[2] ?? "").trim());
  const linhasDados = primeiraPareceHeader ? linhasBrutas.slice(1) : linhasBrutas;

  const linhas: PausaProgramadaRow[] = [];
  let ignoradas = 0;

  for (const linha of linhasDados) {
    const cols = linha.split("\t").map((c) => c.trim());
    const [agente, celula, login, logout, descanso1, pausa20, descanso2] = cols;

    if (!agente || !login || !logout) {
      ignoradas++;
      continue;
    }

    linhas.push({
      operatorEmail: normalizarEmail(agente),
      celula: celula ?? "",
      horaLogin: login,
      horaLogout: logout,
      descanso1: descanso1 ?? "",
      pausa20: pausa20 ?? "",
      descanso2: descanso2 ?? "",
    });
  }

  return { linhas, ignoradas };
}
