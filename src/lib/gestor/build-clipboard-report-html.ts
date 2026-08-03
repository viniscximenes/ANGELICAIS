/**
 * HTML colado no clipboard pelos botões "Copiar como imagem" do painel do
 * gestor — título + subtítulo (texto) + imagem da tabela, nessa ordem
 * vertical. Estrutura/estilo IDÊNTICOS ao formatReportHtml de
 * src/components/d-1/copy-table-button.tsx (Consolidado, referência visual —
 * não importar daquele arquivo pra não acoplar os dois; mudanças ali
 * precisam ser replicadas aqui manualmente se a referência mudar).
 *
 * O Teams Web strippa font-size de <div>/<span>, mas RESPEITA font-size em
 * <h2> — por isso o título precisa ser <h2> (negrito via <b>, que o Teams
 * nunca remove). O subtítulo é um <div> (bloco, quebra de linha) com <i>
 * dentro (itálico). A <img> fica em bloco com display:block (+ <br> de
 * reforço) para não fluir ao lado do texto.
 */
export function buildClipboardReportHtml(options: {
  /** Texto do <h2>, já em maiúsculas se for o caso — vai dentro de <b>. */
  titulo: string;
  /** Texto do subtítulo — pode conter HTML inline (ex: <b>nome</b>), vai dentro de <i>. */
  subtitulo: string;
  pngDataUrl: string;
  altText: string;
}): string {
  const { titulo, subtitulo, pngDataUrl, altText } = options;

  const parts: string[] = [
    `<h2 style="font-size: 16px; margin: 0;"><b>${titulo}</b></h2>`,
    `<div style="margin-top: 4px;"><i>${subtitulo}</i></div>`,
    `<br>`,
    `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="${altText}"></div>`,
  ];
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${parts.join("")}</div>`;
}
