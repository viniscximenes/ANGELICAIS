// Mede, na página REAL (autenticada), o comportamento de fim de rolagem:
// posição do último card do trilho e da assinatura, scrollY/scrollHeight,
// altura do pin-spacer e da section, em passos pequenos do topo ao fim.
//
// Uso: node e2e/measure-scroll-end.js <path> <lastCardId> <outFile>
//   path: "/s/reports/tempo-indisponibilidade" ou "/s/reports/consolidado"
//   lastCardId: id do wrapper do último slide, ex. "trilho-card-3"
//     (RetencaoHorizontalScroll sempre gera #trilho-card-N).
const { chromium } = require("playwright");
const fs = require("fs");
const { login, BASE_URL } = require("./auth");

const VIEWPORTS = [
  { w: 1280, h: 800 },
  { w: 1280, h: 1000 },
  { w: 1440, h: 800 },
  { w: 1440, h: 1000 },
  { w: 1920, h: 800 },
  { w: 1920, h: 1000 },
];
const THEMES = ["dark", "light"];

async function measureOnce(page, lastCardId) {
  return page.evaluate((id) => {
    const card = document.getElementById(id);
    const cardRect = card ? card.getBoundingClientRect() : null;
    const footer = Array.from(document.querySelectorAll("span")).find((s) => s.textContent.includes("Criado por"));
    const footerRect = footer ? footer.getBoundingClientRect() : null;
    const spacer = document.querySelector(".pin-spacer");
    const section = spacer ? spacer.querySelector(":scope > div") : null;
    return {
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      viewportH: window.innerHeight,
      cardTop: cardRect ? Math.round(cardRect.top) : null,
      cardBottom: cardRect ? Math.round(cardRect.bottom) : null,
      footerTop: footerRect ? Math.round(footerRect.top) : null,
      footerBottom: footerRect ? Math.round(footerRect.bottom) : null,
      spacerHeight: spacer ? Math.round(spacer.getBoundingClientRect().height) : null,
      sectionHeight: section ? Math.round(section.getBoundingClientRect().height) : null,
    };
  }, lastCardId);
}

async function run(targetPath, lastCardId, outFile) {
  const browser = await chromium.launch();
  const results = [];

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page);
      await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: "networkidle" });
      if (theme === "light") {
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      }
      await page.waitForTimeout(600);

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(200);

      const samples = [];
      for (let i = 0; i < 50; i++) {
        await page.mouse.wheel(0, 350);
        await page.waitForTimeout(45);
        if (i % 3 === 0) {
          const m = await measureOnce(page, lastCardId);
          samples.push({ step: i, ...m });
        }
      }
      await page.waitForTimeout(500);
      const finalState = await measureOnce(page, lastCardId);

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      results.push({ theme, vw: vp.w, vh: vp.h, samples, finalState, pageOverflow });
      await page.close();
      console.log(`done ${targetPath} theme=${theme} ${vp.w}x${vp.h}`);
    }
  }

  await browser.close();
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log("Salvo em", outFile);
}

const [, , targetPath, lastCardId, outFile] = process.argv;
if (!targetPath || !lastCardId || !outFile) {
  console.error("Uso: node e2e/measure-scroll-end.js <path> <lastCardId> <outFile>");
  process.exit(1);
}
run(targetPath, lastCardId, outFile);
