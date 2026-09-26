/**
 * Resolve o valor computado de uma CSS custom property — por padrão no
 * elemento raiz do documento (onde o ThemeProvider aplica [data-theme]/.dark),
 * pegando a cor do tema GLOBAL da sessão, sem depender de `var(--x)` ser
 * resolvido em contextos isolados (ex: dentro do clone usado pela captura de
 * PNG, ou num SVG `<stop>` de gradiente).
 *
 * Em rotas com tema ESCOPADO via atributo (ex: [data-page="reports-consolidado"]
 * sobrescrevendo --background/--success/--danger/... só dentro daquele
 * seletor, como em reports-consolidado.css), o elemento raiz do documento
 * NÃO carrega esses valores — passar `elemento` (qualquer nó dentro do
 * escopo, já que custom properties herdam por cascata) resolve o valor
 * correto daquele tema escopado em vez do valor genérico do :root/.dark
 * global. Sem `elemento`, o comportamento é idêntico ao de antes (raiz do
 * documento) — não quebra nenhum chamador existente.
 */
export function resolverTokenCss(
  nome: string,
  fallback: string,
  elemento?: HTMLElement | null,
): string {
  if (typeof document === "undefined") return fallback;
  const alvo = elemento ?? document.documentElement;
  const valor = getComputedStyle(alvo).getPropertyValue(nome).trim();
  return valor || fallback;
}
