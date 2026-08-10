/**
 * Formata o texto "O supervisor NOME fez um report às HH:MM" exibido nas 3
 * tabelas do painel do gestor. Sem nome gravado (dado legado, anterior a essa
 * feature), cai no fallback "Atualizado às HH:MM". Retorna null sem hora.
 */
export function formatReportLabel(
  hora: string | null | undefined,
  nomeSupervisor: string | null | undefined,
): string | null {
  if (!hora || hora === "—" || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const nome = nomeSupervisor?.trim();
  if (nome) {
    return `O supervisor ${nome} fez um report às ${horaCurta}`;
  }
  return `Atualizado às ${horaCurta}`;
}
