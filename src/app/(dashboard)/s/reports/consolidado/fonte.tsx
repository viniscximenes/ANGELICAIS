import { Inter } from "next/font/google";

/**
 * Fonte de /s/reports/consolidado: Inter em tudo (texto e números, com
 * tabular-nums — ver "Fonte única" em reports-consolidado.css). Usada por
 * page.tsx e loading.tsx, pra o esqueleto medir igual à página real.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const FAMILIA = `${inter.style.fontFamily}, ui-sans-serif, system-ui, sans-serif`;

/**
 * Aplica a Inter via --font-sans em TODO elemento [data-page="reports-consolidado"]
 * — inclusive popovers/dialogs/menu lateral, que vivem em portal fora do
 * container da página mas carregam o mesmo atributo — e nos toasts desta
 * rota (montados no body). Um <style> global em vez de uma classe no
 * container: classe/variável no container não alcançaria os portais.
 */
export function FonteConsolidado() {
  return (
    <style>{`
[data-page="reports-consolidado"] { --font-sans: ${FAMILIA}; }
.reports-consolidado-toast { font-family: ${FAMILIA} !important; }
`}</style>
  );
}
