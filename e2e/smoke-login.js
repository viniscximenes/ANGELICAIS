const { chromium } = require("playwright");
const { login, BASE_URL } = require("./auth");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await login(page);
    console.log("Login OK. URL final:", page.url());
    await page.goto(`${BASE_URL}/reports/tempo-indisponibilidade`, { waitUntil: "networkidle" });
    console.log("tempo-indisponibilidade status:", page.url());
    const title = await page.textContent("h1");
    console.log("h1:", title);
  } catch (err) {
    console.error("FALHOU:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
