/**
 * Spinner de loading — Uiverse.io by abrahamcalsin ("dot-spinner"):
 * https://uiverse.io/abrahamcalsin/serious-turkey-52
 *
 * Substitui o círculo genérico (border animate-spin) usado antes nas telas
 * de loading de /s/reports/consolidado (Suspense inicial + overlay de refresh
 * manual). Puro CSS (ver `.dot-spinner*`/`@keyframes` em
 * reports-consolidado.css e reports-tempo-indisp.css, cada um escopado à
 * própria rota) — este componente só monta o markup (8 pontos), sem JS de
 * animação. A cor (--uib-color) lê var(--foreground) da página e acompanha
 * automaticamente o tema Zen Linen claro/escuro.
 */
export function DotSpinner() {
  return (
    <div className="dot-spinner" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="dot-spinner__dot" />
      ))}
    </div>
  );
}
