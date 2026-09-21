/**
 * Util compartilhado pelos botões "Copiar como imagem" do painel do gestor
 * (Consolidado, Tempo Logado & Indisponibilidade, KPI) — antes cada botão
 * tinha sua própria cópia de escapeHtml/copyFormattedHtml, três vezes
 * divergindo só por detalhes de nome de variável.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Copia HTML formatado (título + imagem) para a área de transferência.
 * Tenta execCommand primeiro (preserva estilos inline sem sanitização);
 * cai para ClipboardItem se o navegador não suportar/permitir.
 */
export async function copyFormattedHtml(html: string): Promise<void> {
  try {
    const container = document.createElement("div");
    container.setAttribute("contenteditable", "true");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.whiteSpace = "pre-wrap";
    container.innerHTML = html;
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const ok = document.execCommand("copy");
      selection.removeAllRanges();
      document.body.removeChild(container);
      if (ok) return;
    } else {
      document.body.removeChild(container);
    }
  } catch (e) {
    console.warn("[copy-formatted-html] execCommand falhou, tentando ClipboardItem:", e);
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}
