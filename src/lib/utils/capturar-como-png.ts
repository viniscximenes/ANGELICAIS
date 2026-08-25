import { domToPng } from "modern-screenshot";

import { resolverTokenCss } from "./resolver-token-css";

const PADDING_PADRAO_PX = 28;

export interface CapturarComoPngOpcoes {
  /** Pixel ratio da captura (padrão 3, igual ao já usado em todo o sistema). */
  scale?: number;
  /** Respiro ao redor do conteúdo, em px, preenchido com --background do tema atual (padrão 28). */
  padding?: number;
}

/**
 * Captura um elemento como PNG com uma margem de respiro ao redor, sempre
 * na cor --background do tema ATUAL da sessão — usar em TODA
 * exportação/cópia de imagem do sistema (em vez de chamar `domToPng` cru),
 * pra manter um padrão visual único e não duplicar esse cálculo em cada
 * botão de export/copiar como imagem.
 *
 * Implementado só com as opções nativas do modern-screenshot
 * (width/height forçados + style.padding + backgroundColor) — não move
 * nem clona nada no DOM ao vivo, só afeta o clone interno que a lib já
 * cria pra capturar.
 *
 * width/height precisam ser passados explicitamente (em vez de deixar a
 * lib medir sozinha): ela mede o elemento ORIGINAL (getBoundingClientRect)
 * ANTES de aplicar `style`/`backgroundColor` no clone — se não for
 * informado, o padding entra mas o canvas final não cresce pra
 * acomodá-lo, e o conteúdo fica cortado.
 */
export async function capturarComoPng(
  alvo: HTMLElement,
  opcoes: CapturarComoPngOpcoes = {},
): Promise<string> {
  const { scale = 3, padding = PADDING_PADRAO_PX } = opcoes;
  const rect = alvo.getBoundingClientRect();
  const backgroundColor = resolverTokenCss("--background", "#ffffff");

  return domToPng(alvo, {
    scale,
    backgroundColor,
    width: Math.ceil(rect.width) + padding * 2,
    height: Math.ceil(rect.height) + padding * 2,
    style: {
      padding: `${padding}px`,
      boxSizing: "border-box",
    },
  });
}
