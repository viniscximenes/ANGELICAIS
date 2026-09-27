const { chromium } = require("playwright");
const { login, BASE_URL } = require("./auth");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto(`${BASE_URL}/reports/tempo-indisponibilidade`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const info = await page.evaluate(() => {
    function tableInfo(sel) {
      const t = document.querySelector(sel);
      if (!t) return null;
      const rows = t.children.length - 1;
      const header = t.firstElementChild;
      const headerH = header.getBoundingClientRect().height;
      const totalH = t.getBoundingClientRect().height;
      const rowsH = totalH - headerH;
      return { rows, headerH: Math.round(headerH), totalH: Math.round(totalH), rowsH: Math.round(rowsH), perRow: rows > 0 ? Math.round((rowsH / rows) * 100) / 100 : null };
    }
    const slide0 = document.getElementById("trilho-card-0");
    const cardsResumoH = slide0 ? slide0.firstElementChild.children[0].getBoundingClientRect().height : null;
    return {
      pausas: tableInfo("[data-pausas-tabela]"),
      aderencia: tableInfo("[data-aderencia-tabela]"),
      naoRealizadas: tableInfo("[data-pausas-nao-realizadas-tabela]"),
      estouro: tableInfo("[data-estouro-pausa-tabela]"),
      cardsResumoH: cardsResumoH ? Math.round(cardsResumoH) : null,
      slide0totalGap: 24, // gap-6
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})();
