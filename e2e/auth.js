// Helper de login reaproveitado por todos os scripts e2e/ — usa o fluxo de
// login REAL da página (/login, LoginForm -> loginAction), sem bypass. Lê
// as credenciais de .env.e2e.local (gitignored, nunca commitado).
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const out = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

const envFile = loadEnvFile(path.join(__dirname, "..", ".env.e2e.local"));
const USERNAME = process.env.E2E_GESTOR_USERNAME || envFile.E2E_GESTOR_USERNAME;
const PASSWORD = process.env.E2E_GESTOR_PASSWORD || envFile.E2E_GESTOR_PASSWORD;

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

if (!USERNAME || !PASSWORD) {
  throw new Error(
    "Credenciais de GESTOR ausentes: defina E2E_GESTOR_USERNAME/E2E_GESTOR_PASSWORD em .env.e2e.local (raiz do projeto, gitignored).",
  );
}

/** Faz login REAL via /login (fluxo normal do app) numa página Playwright já aberta. */
async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", USERNAME);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  // loginAction faz redirect() server-side pra /s/reports/consolidado (GESTOR) —
  // espera a navegação completar.
  await page.waitForURL(/\/reports\//, { timeout: 15000 });
}

module.exports = { login, BASE_URL };
