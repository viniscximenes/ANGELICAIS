/**
 * Spinner de loading — Uiverse.io by abrahamcalsin ("dot-spinner"):
 * https://uiverse.io/abrahamcalsin/serious-turkey-52
 *
 * Substitui o círculo genérico (border animate-spin) usado antes nas telas
 * de loading de /reports/consolidado (Suspense inicial + overlay de refresh
 * manual). Puro CSS (ver `.dot-spinner*`/`@keyframes` em
 * reports-consolidado.css, escopados a [data-page="reports-consolidado"]) —
 * este componente só monta o markup (8 pontos), sem nenhum JS de animação.
 * A cor (--uib-color) lê var(--foreground) da página, então acompanha o
 * tema Zen Linen (claro/escuro) automaticamente — não usar fora do escopo
 * data-page="reports-consolidado" (a regra CSS não existe fora dele).
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
