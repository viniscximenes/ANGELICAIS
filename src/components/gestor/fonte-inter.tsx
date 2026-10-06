import { Inter } from "next/font/google";

/**
 * Fonte das páginas no padrão do Consolidado: Inter em tudo (texto e
 * números, com tabular-nums). Usada pelo page.tsx e pelo esqueleto de cada
 * página, pra o esqueleto medir igual à página real.
 */
// Só "latin": cobre todo o português (ç, ã, é...); "latin-ext" baixava um
// arquivo de fonte a mais sem uso.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const FAMILIA = `${inter.style.fontFamily}, ui-sans-serif, system-ui, sans-serif`;

/**
 * Aplica a Inter via --font-sans em TODO elemento [data-page="<dataPage>"]
 * — inclusive popovers/dialogs/menu lateral, que vivem em portal fora do
 * container da página mas carregam o mesmo atributo — e nos toasts da
 * rota (montados no body, identificados por `toastClass`). Um <style>
 * global em vez de uma classe no container: classe/variável no container
 * não alcançaria os portais.
 *
 * "Fonte única": ds-mono / ds-mono-sm / ds-display (globals.css) usam
 * var(--font-mono); aqui viram a Inter com tabular-nums, que mantém o
 * alinhamento das colunas numéricas que o mono garantia.
 */
export function FonteInter({ dataPage, toastClass }: { dataPage: string; toastClass: string }) {
  return (
    <style>{`
[data-page="${dataPage}"] { --font-sans: ${FAMILIA}; }
[data-page="${dataPage}"] :is(.ds-mono, .ds-mono-sm, .ds-display) { font-family: var(--font-sans); font-variant-numeric: tabular-nums; }
.${toastClass} { font-family: ${FAMILIA} !important; }
`}</style>
  );
}
