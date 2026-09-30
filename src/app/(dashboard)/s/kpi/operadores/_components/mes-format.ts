/**
 * Formatação de mes_ref ("2026-09-01") pro cabeçalho e pro seletor de mês —
 * exclusivo de /kpi/operadores (o resto do sistema usa MESES_PT/formatMesRef
 * próprios em cada tela, sem uma fonte compartilhada; não criamos uma pra
 * não sair do escopo desta rota).
 */

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function mesIndex(mesRef: string): number {
  const [, month] = mesRef.split("-");
  return Number(month) - 1;
}

/** "2026-09-01" → "Set" (abreviação pt-BR, inicial maiúscula). */
export function formatMesAbrev(mesRef: string): string {
  return MESES_ABREV[mesIndex(mesRef)] ?? mesRef;
}

/** "2026-09-01" → "2026". */
export function anoDoMes(mesRef: string): string {
  return mesRef.split("-")[0];
}

/** "2026-09-01" → "setembro de 2026" (minúsculo, pt-BR por extenso). */
export function formatMesPorExtenso(mesRef: string): string {
  const ano = anoDoMes(mesRef);
  const mes = MESES_EXTENSO[mesIndex(mesRef)] ?? mesRef;
  return `${mes} de ${ano}`;
}

/**
 * "2026-09-01" → "Setembro de 2026" (inicial maiúscula) — só pro subtítulo
 * do cabeçalho. `formatMesPorExtenso` (minúsculo) continua sendo o usado no
 * aria-label do seletor de mês e nas mensagens de carregando/vazio.
 */
export function formatMesCapitalizado(mesRef: string): string {
  const base = formatMesPorExtenso(mesRef);
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** "2026" → "26" (2 dígitos, pro sufixo "Dez/25" do seletor de mês). */
export function anoAbreviado(mesRef: string): string {
  return anoDoMes(mesRef).slice(2);
}
