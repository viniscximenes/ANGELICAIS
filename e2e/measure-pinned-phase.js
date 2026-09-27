// Mede a FASE PINADA (requisito 4): pra cada um dos N slides do trilho,
// navega até ele (via requestScrollToCard, mesmo mecanismo da sidebar) e
// mede, enquanto a section está PINADA (position:fixed), se o conteúdo do
// slide (scrollHeight real) excede a altura da viewport — ou seja, se há
// conteúdo abaixo do fold que NUNCA fica visível enquanto pinado (o scroll
// vertical normal está "sequestrado" convertendo em progresso horizontal).
//
// Uso: node e2e/measure-pinned-phase.js <path> <numSlides> <outFile> [simulateRows]
//   simulateRows: se passado (ex. 30), duplica linhas de cada tabela via DOM
//   (client-side only, não escreve no banco) pra simular uma base maior.
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

async function simulateMoreRows(page, multiplier) {
  await page.evaluate((mult) => {
    const selectors = [
      "[data-pausas-tabela]",
      "[data-aderencia-tabela]",
      "[data-pausas-nao-realizadas-tabela]",
      "[data-estouro-pausa-tabela]",
    ];
    for (const sel of selectors) {
      const table = document.querySelector(sel);
      if (!table) continue;
      const rows = Array.from(table.children).slice(1); // pula o header
      if (rows.length === 0) continue;
      for (let i = 1; i < mult; i++) {
        for (const row of rows) {
          table.appendChild(row.cloneNode(true));
        }
      }
    }
  }, multiplier);
}

async function run(targetPath, numSlides, outFile, simulateRows) {
  const browser = await chromium.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await login(page);
    await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    if (simulateRows) {
      await simulateMoreRows(page, Number(simulateRows));
      await page.waitForTimeout(600); // dá tempo pro ResizeObserver/refresh reagir
    }

    const perSlide = [];
    for (let i = 0; i < numSlides; i++) {
      // Navega via requestScrollToCard — MESMO mecanismo real que a sidebar
      // usa (src/lib/retencao/scroll-to-card-event.ts): dispara o MESMO
      // CustomEvent no window que o app já escuta. Não é bypass nem código
      // novo no app — é o "API" público que o próprio componente expõe.
      await page.evaluate((idx) => {
        window.dispatchEvent(new CustomEvent("retencao-scroll-to-card", { detail: idx }));
      }, i);
      await page.waitForTimeout(900);

      const measurement = await page.evaluate((idx) => {
        const slide = document.getElementById(`trilho-card-${idx}`);
        const section = slide ? slide.closest("div.relative") : null;
        const isPinned = section ? getComputedStyle(section).position === "fixed" : null;
        const content = slide ? slide.firstElementChild : null;
        const contentNaturalHeight = content ? content.scrollHeight : null;
        const slideClientHeight = slide ? slide.clientHeight : null;
        const viewportH = window.innerHeight;
        return {
          slideIndex: idx,
          isPinned,
          contentNaturalHeight,
          slideClientHeight,
          viewportH,
          // conteúdo cortado (inacessível durante o pin) = o que sobra além
          // da altura de fato clicável/visível do slide na viewport.
          hiddenBelowFoldPx: contentNaturalHeight !== null && slideClientHeight !== null
            ? Math.max(0, contentNaturalHeight - Math.min(slideClientHeight, viewportH))
            : null,
        };
      }, i);
      perSlide.push(measurement);
    }

    results.push({ vw: vp.w, vh: vp.h, perSlide });
    await page.close();
    console.log(`done ${targetPath} ${vp.w}x${vp.h}`);
  }

  await browser.close();
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log("Salvo em", outFile);
}

const [, , targetPath, numSlides, outFile, simulateRows] = process.argv;
if (!targetPath || !numSlides || !outFile) {
  console.error("Uso: node e2e/measure-pinned-phase.js <path> <numSlides> <outFile> [simulateRows]");
  process.exit(1);
}
run(targetPath, Number(numSlides), outFile, simulateRows);
