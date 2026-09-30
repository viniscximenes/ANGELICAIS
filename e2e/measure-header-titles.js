// Mede, na página real autenticada, a altura/topo/baseline dos 8 títulos do
// cabeçalho da tabela principal (data-tempo-indisp-table), pra achar a
// causa exata do desalinhamento vertical de "Pausa Particular %" e
// "Outras Pausas %".
const { chromium } = require("playwright");
const { login, BASE_URL } = require("./auth");

const VIEWPORTS = [1280, 1440, 1920];
const THEMES = ["dark", "light"];

(async () => {
  const browser = await chromium.launch();
  for (const theme of THEMES) {
    for (const vw of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vw, height: 900 });
      await login(page);
      await page.goto(`${BASE_URL}/s/reports/tempo-indisponibilidade`, { waitUntil: "networkidle" });
      if (theme === "light") {
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      }
      await page.waitForTimeout(500);

      const info = await page.evaluate(() => {
        const table = document.querySelector("[data-tempo-indisp-table]");
        if (!table) return null;
        const header = table.firstElementChild;
        const cells = Array.from(header.children);
        return cells.map((cell) => {
          const rect = cell.getBoundingClientRect();
          const cs = getComputedStyle(cell);
          // encontra o nó de texto direto (ignora botões filhos tipo o olho)
          let textEl = cell;
          const range = document.createRange();
          range.selectNodeContents(cell);
          const textRect = range.getBoundingClientRect();
          return {
            text: cell.textContent.trim().slice(0, 30),
            cellHeight: Math.round(rect.height * 100) / 100,
            cellTop: Math.round(rect.top * 100) / 100,
            textTop: Math.round(textRect.top * 100) / 100,
            textBottom: Math.round(textRect.bottom * 100) / 100,
            textHeight: Math.round((textRect.bottom - textRect.top) * 100) / 100,
            whiteSpace: cs.whiteSpace,
            lineHeight: cs.lineHeight,
            childCount: cell.children.length,
            scrollHeight: cell.scrollHeight,
            clientHeight: cell.clientHeight,
            wraps: cell.scrollHeight > cell.clientHeight + 1,
          };
        });
      });
      console.log(`=== ${theme} ${vw}px ===`);
      console.log(JSON.stringify(info, null, 2));
      await page.close();
    }
  }
  await browser.close();
})();
