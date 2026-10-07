/**
 * Coluna DATE dos relatórios do Five9 → "YYYY-MM-DD". Aceita AAAA/MM/DD ou
 * DD/MM/AAAA (com "/" ou "-"), detectado pelo segmento de 4 dígitos.
 * Inválido/vazio → null. Puro (sem dependências), roda no client e no server.
 */
export function parseDataFlexivel(val: string | undefined | null): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  const m = cleaned.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (!m) return null;

  const [, p1, p2, p3] = m;
  let year: string, month: string, day: string;
  if (p1.length === 4) {
    year = p1;
    month = p2;
    day = p3;
  } else if (p3.length === 4) {
    day = p1;
    month = p2;
    year = p3;
  } else {
    return null;
  }

  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Dias distintos (YYYY-MM-DD) em ordem — o formato de report_datas_base. */
export function diasDistintosOrdenados(dias: Iterable<string | null | undefined>): string[] {
  return Array.from(new Set(Array.from(dias).filter((d): d is string => Boolean(d)))).sort();
}
