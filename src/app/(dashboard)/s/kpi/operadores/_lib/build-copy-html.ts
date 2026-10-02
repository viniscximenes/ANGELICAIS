import { formatDateBR } from "@/lib/utils/format-datetime-br";

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const AVISO_TEXTO =
  "RV estimado com a regra atual. Indisp e ABS ainda podem ser contestados no envio do RV real, então inelegibilidade aqui não é definitiva. Não inclui perdas por feedback, que só aparecem no RV do fechamento.";

/**
 * "<título> - dd/mm" (dd/mm = data_corte do mês exibido). Sem data_corte
 * ainda (mês sem import), o título fica sem sufixo — mesmo comportamento de
 * antes desta rodada.
 */
export function tituloComData(tituloBase: string, dataCorte: string | null): string {
  if (!dataCorte) return tituloBase;
  return `${tituloBase} - ${formatDateBR(dataCorte).slice(0, 5)}`;
}

/**
 * HTML colado no clipboard pelo "Copiar imagem" desta rota — MESMO
 * formato/estilo de buildClipboardReportHtml (lib/gestor/build-clipboard-report-html.ts,
 * NÃO alterada). Essa função compartilhada não aceita conteúdo extra (só
 * titulo/subtitulo/img), então o formato foi replicado aqui pra acrescentar
 * o aviso de RV opcional sem editar o arquivo compartilhado (comentário
 * dela mesma já avisa: "mudanças [na referência] precisam ser replicadas
 * aqui manualmente" — mesma lógica se aplica a esta 2ª réplica).
 *
 * <h2> pro título (Teams Web preserva font-size só em <h2>, não em <div>);
 * <img> em bloco; aviso (quando `comAvisoRv`) é um <p> DEPOIS da imagem —
 * nunca entra no PNG capturado, que é só a tabela.
 */
export function buildKpiClipboardHtml(options: {
  titulo: string;
  pngDataUrl: string;
  altText: string;
  /** true = inclui o aviso de RV (somente com a coluna "Total (RV)" visível). */
  comAvisoRv: boolean;
}): string {
  const { titulo, pngDataUrl, altText, comAvisoRv } = options;

  // Só o título ("TABELA DO KPI - dd/mm") — sem a linha "atualizado até".
  const parts: string[] = [
    `<h2 style="font-size: 16px; margin: 0;"><b>${titulo}</b></h2>`,
    `<br>`,
    `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="${altText}"></div>`,
  ];

  if (comAvisoRv) {
    parts.push(`<p style="margin-top: 8px; font-size: 13px;"><b>Aviso:</b> ${AVISO_TEXTO}</p>`);
  }

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${parts.join("")}</div>`;
}

/** Versão text/plain do mesmo conteúdo — sem a imagem (não existe em texto puro). */
export function buildKpiClipboardTextoPlano(titulo: string, comAvisoRv: boolean): string {
  return comAvisoRv ? `${titulo}\n\nAviso: ${AVISO_TEXTO}` : titulo;
}
