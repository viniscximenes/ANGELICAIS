/**
 * Converte uma célula de planilha (KPI de operador ou de gestor) em número.
 *
 * Compartilhado entre extract-snapshot (planilha do operador) e
 * extract-gestor-snapshot (planilha do gestor) — antes era copiado nos dois,
 * e a divergência entre as cópias era o que deixava o bug passar.
 *
 * Regras:
 *  - "—", "-", "", "n/a"   → null
 *  - "HH:MM:SS" (duração)   → total em SEGUNDOS.
 *      A hora aceita 1 a 4 dígitos. As células de tempo_login/tempo_projetado
 *      acumulam o mês inteiro e passam de 100h ("139:20:00", "145:40:00").
 *      Com a hora limitada a 2 dígitos, essas strings NÃO casavam como
 *      duração e caíam no parseFloat abaixo → viravam o inteiro "139"/"145"
 *      (dígitos até o primeiro `:`). TMA nunca chega a 100h, então nunca foi
 *      afetado — e continua convertendo normalmente por este mesmo ramo
 *      quando vem como "HH:MM:SS".
 *  - número BR: vírgula = decimal, ponto = milhar
 *      ("4.223" = 4223, "63,8" = 63.8, "1.234,56" = 1234.56)
 */
export function parseNumeric(value: string): number | null {
  if (
    !value ||
    value === "—" ||
    value === "-" ||
    value.toLowerCase() === "n/a"
  ) {
    return null;
  }

  const stripped = value.trim().replace(/%/g, "");

  // Duração tem prioridade: HH:MM:SS (hora com 1 a 4 dígitos).
  const timeMatch = stripped.match(/^(\d{1,4}):(\d{2}):(\d{2})$/);
  if (timeMatch) {
    const [, h, m, s] = timeMatch;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
  }

  // Formato numérico BR: vírgula = separador decimal, ponto = milhar.
  const hasComma = stripped.includes(",");
  const hasDot = stripped.includes(".");

  let normalized: string;

  if (hasComma) {
    // Vírgula é decimal; pontos (se houver) são separadores de milhar.
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    // Sem vírgula. Ponto é milhar se houver exatamente 3 dígitos após o
    // último ponto; senão é ponto decimal (ex.: "63.8").
    const segments = stripped.split(".");
    const lastSegLen = (segments[segments.length - 1] ?? "").length;
    normalized = lastSegLen === 3 ? stripped.replace(/\./g, "") : stripped;
  } else {
    normalized = stripped;
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}
