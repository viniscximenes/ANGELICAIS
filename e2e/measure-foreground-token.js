const { chromium } = require("playwright");
const { login, BASE_URL } = require("./auth");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto(`${BASE_URL}/reports/tempo-indisponibilidade`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  for (const theme of ["dark", "light"]) {
    // MESMO mecanismo de applyThemeToDocument (theme-provider.tsx): seta
    // data-theme E alterna a classe .dark juntos — os dois em conjunto,
    // nunca só um dos dois.
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.classList.toggle("dark", t === "dark");
    }, theme);
    await page.waitForTimeout(150);
    const rgb = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.color = "var(--foreground)";
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe).color;
      document.body.removeChild(probe);
      // Chromium retorna oklch() textual (CSS Color 4) — converte pra rgb
      // via canvas 2D (o navegador resolve a cor internamente ao desenhar).
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = computed;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return { computed, rgb: `rgb(${r}, ${g}, ${b})`, alpha: a };
    });
    console.log(theme, "var(--foreground) =", rgb);
  }
  await browser.close();
})();
