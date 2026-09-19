import type Lenis from "lenis";

/**
 * Referência global pra ÚNICA instância de Lenis do site (criada em
 * LenisProvider). Existe pra permitir que scroll programático feito fora do
 * provider (ex: atalho de teclado em gestor-equipe-section.tsx) passe pelo
 * `lenis.scrollTo` em vez de `window.scrollBy`/`scrollIntoView` nativos.
 *
 * Chamar scroll nativo com `behavior: "smooth"` enquanto o Lenis também
 * controla o RAF do scroll faz os dois sistemas de smoothing brigarem pelo
 * mesmo scrollTop: o Lenis mantém internamente um alvo de scroll próprio
 * (`animatedScroll`) e, no primeiro wheel/touch subsequente, "puxa" a
 * página de volta pra esse alvo — desfazendo/travando o scroll nativo que
 * acabou de rodar. Passar pelo `lenis.scrollTo` mantém os dois estados
 * sincronizados.
 */
let lenisInstance: Lenis | null = null;

export function setLenisInstance(lenis: Lenis | null): void {
  lenisInstance = lenis;
}

export function getLenisInstance(): Lenis | null {
  return lenisInstance;
}
