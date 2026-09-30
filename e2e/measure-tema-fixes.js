// Valida, na página real autenticada, os 5 itens de ajuste de tema.
const { chromium } = require("playwright");
const { login, BASE_URL } = require("./auth");

const VIEWPORTS = [1280, 1440, 1920];
const THEMES = ["dark", "light"];

async function setTheme(page, theme) {
  // MESMO mecanismo de applyThemeToDocument (theme-provider.tsx): data-theme
  // E a classe .dark, sempre os dois juntos — sem isso, "dark" no teste não
  // era o tema escuro real (var(--foreground) confirmado errado antes desta
  // correção: media pegava o fallback de :root, não o de `.dark`).
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await chromium.launch();
  const results = { colunas: [], titulos: [], indisp: [], aderencia: [], estouro: [] };

  for (const theme of THEMES) {
    for (const vw of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vw, height: 900 });
      await login(page);
      await page.goto(`${BASE_URL}/s/reports/tempo-indisponibilidade`, { waitUntil: "networkidle" });
      await setTheme(page, theme);

      // Item 1: cor das 5 colunas (Login, Logout, NR17%, Pausa Particular%, Outras Pausas%)
      const colunas = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll("[data-tempo-indisp-table]"));
        const table = all.find((el) => el.getBoundingClientRect().top > -1000 && el.getBoundingClientRect().left > -1000);
        if (!table) return "TABELA_VISIVEL_AUSENTE (sem dados hoje)";
        const rows = Array.from(table.children).slice(1);
        const firstRealRow = rows.find((r) => {
          const cells = Array.from(r.children);
          return cells[2] && cells[2].textContent.trim() !== "—";
        });
        if (!firstRealRow) return null;
        const cells = Array.from(firstRealRow.children);
        // 0=Operador 1=TempoLogado(bullet) 2=Login 3=Logout 4=Indisp(bullet) 5=NR17 6=Particular 7=Outras
        const idxMap = { login: 2, logout: 3, nr17: 5, particular: 6, outras: 7 };
        const out = {};
        for (const [key, idx] of Object.entries(idxMap)) {
          const el = cells[idx];
          out[key] = { text: el.textContent.trim(), color: getComputedStyle(el).color };
        }
        return out;
      });
      results.colunas.push({ theme, vw, colunas });

      // Item 2: alinhamento vertical dos títulos
      const titulos = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll("[data-tempo-indisp-table]"));
        const table = all.find((el) => el.getBoundingClientRect().top > -1000 && el.getBoundingClientRect().left > -1000);
        if (!table) return "TABELA_VISIVEL_AUSENTE (sem dados hoje)";
        const header = table.firstElementChild;
        const cells = Array.from(header.children);
        return cells.map((cell) => {
          const range = document.createRange();
          range.selectNodeContents(cell);
          const r = range.getBoundingClientRect();
          return { text: cell.textContent.trim().slice(0, 20), top: Math.round(r.top * 100) / 100, bottom: Math.round(r.bottom * 100) / 100 };
        });
      });
      results.titulos.push({ theme, vw, titulos });

      await page.close();
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
