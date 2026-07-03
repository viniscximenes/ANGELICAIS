const SEPARATOR = "|";

/**
 * BASE - 1 e BASE - 2 não têm coluna livre depois da hora do report (T e M
 * excedem o limite de colunas da grade da guia — erro do Sheets "exceeds
 * grid limits"), então hora e nome do supervisor são gravados juntos numa
 * única célula, formato "HH:MM|NOME".
 */
export function encodeReportStamp(hora: string, nomeSupervisor: string): string {
  return `${hora}${SEPARATOR}${nomeSupervisor}`;
}

/**
 * Separa hora + nome de uma célula gravada por encodeReportStamp.
 * Bases antigas (gravadas antes desse formato) têm só a hora, sem
 * separador — nesse caso nomeSupervisor volta null e hora é o valor bruto
 * da célula (string, número serial do Sheets ou Date), para quem for
 * formatá-la (ex.: parseHora) continuar funcionando sem quebrar.
 */
export function decodeReportStamp(value: unknown): {
  hora: unknown;
  nomeSupervisor: string | null;
} {
  if (typeof value === "string" && value.includes(SEPARATOR)) {
    const idx = value.indexOf(SEPARATOR);
    const hora = value.slice(0, idx).trim();
    const nomeSupervisor = value.slice(idx + 1).trim();
    return { hora, nomeSupervisor: nomeSupervisor || null };
  }
  return { hora: value, nomeSupervisor: null };
}
