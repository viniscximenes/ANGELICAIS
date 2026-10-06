/**
 * Texto da 2ª linha do cabeçalho das páginas de report ("{nome} fez um
 * report às {hora}"), com os dias da base no fim quando existirem —
 * "(base do dia 03/10)" ou, com mais de um dia, "(bases do dia 02/10 -
 * 03/10)": um gestor pode colar a base de outra data e a atualização vale
 * pra todos. Uploads sem a informação dos dias vêm sem o trecho.
 *
 * Mesma checagem de "hora ausente/zerada" de formatReportLabel
 * (@/lib/gestor/format-report-label), com um texto mais curto (sem
 * "Equipe -" e sem "O supervisor"). Sem report (hora nula/zerada): null e
 * a linha inteira some.
 */
export function formatCabecalhoReport(
  hora: string | null | undefined,
  nomeSupervisor: string | null | undefined,
  datasBase?: string[] | null,
): string | null {
  if (!hora || hora === "—" || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const nome = nomeSupervisor?.trim();
  const texto = nome ? `${nome} fez um report às ${horaCurta}` : `Atualizado às ${horaCurta}`;
  return `${texto}${formatDiasBase(datasBase)}`;
}

/** ["2026-10-02", "2026-10-03"] → "  -   (bases do dia 02/10 - 03/10)". */
function formatDiasBase(datasBase: string[] | null | undefined): string {
  const dias = (datasBase ?? [])
    .map((iso) => iso.match(/^\d{4}-(\d{2})-(\d{2})/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => `${m[2]}/${m[1]}`);
  if (dias.length === 0) return "";
  // Separador "  -   " com os espaços exatos pedidos (o <p> usa
  // whitespace-pre-wrap pra não colapsar os espaços).
  const separador = "  -   ";
  return dias.length === 1
    ? `${separador}(base do dia ${dias[0]})`
    : `${separador}(bases do dia ${dias.join(" - ")})`;
}
