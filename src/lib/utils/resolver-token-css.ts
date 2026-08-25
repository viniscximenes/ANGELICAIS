/**
 * Resolve o valor computado de uma CSS custom property no elemento raiz do
 * documento (onde o ThemeProvider aplica [data-theme]/.dark) — pega a cor
 * do tema ATUAL da sessão, sem depender de `var(--x)` ser resolvido em
 * contextos isolados (ex: dentro do clone usado pela captura de PNG, ou
 * num SVG `<stop>` de gradiente).
 */
export function resolverTokenCss(nome: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return valor || fallback;
}
