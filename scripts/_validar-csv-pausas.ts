import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

async function main() {
  const { parseCsvPausas } = await import("../src/lib/db/parse-csv-pausas");
  const { salvarCsvPausas } = await import("../src/lib/db/salvar-csv-pausas");
  const {
    detectarRegistros,
    aplicarRegrasDetecao,
    REASON_CODES_PAUSA_1MIN,
    TEMPO_LOGADO_MINIMO_SEG,
  } = await import("../src/lib/db/detectar-registros");

  const csvPath =
    "C:/Users/ximenes/Downloads/Login, logout e pausas 260715_002942.csv";
  const buffer = fs.readFileSync(csvPath);

  console.log("=== PASSO 1: parse ===");
  const parseResult = parseCsvPausas(new Uint8Array(buffer));
  console.log("encodingDetectado:", parseResult.encodingDetectado);
  console.log("lidas:", parseResult.lidas);
  console.log("validas:", parseResult.validas);
  console.log("puladas:", parseResult.puladas);

  const reasonCodesReais = new Set(
    parseResult.linhas.map((l) => l.reason_code).filter((r): r is string => !!r),
  );
  console.log("\nreason codes reais encontrados no CSV:");
  console.log([...reasonCodesReais].sort().join(" | "));

  console.log("\nreason codes da REGRA 1 e se existem no CSV:");
  for (const rc of REASON_CODES_PAUSA_1MIN) {
    console.log(`  ${rc}: ${reasonCodesReais.has(rc) ? "OK encontrado" : "NÃO encontrado no CSV"}`);
  }

  const nomesComAcento = parseResult.linhas
    .map((l) => l.agent_name)
    .filter((n) => /[ÃÂ]/.test(n));
  console.log("\nnomes com possível mojibake residual (deveria ser vazio):", nomesComAcento.length);

  const dataRefs = new Set(parseResult.linhas.map((l) => l.data_ref));
  console.log("\ndata_ref únicas no CSV:", [...dataRefs]);

  console.log("\n=== PASSO 2: salvar no banco ===");
  const saveResult = await salvarCsvPausas(parseResult.linhas);
  console.log(saveResult);

  if (!saveResult.success) {
    console.error("Falha ao salvar — abortando validação da detecção.");
    return;
  }

  console.log("\n=== PASSO 3/4: detectar registros ===");
  const dataRef = [...dataRefs][0];
  const registros = await detectarRegistros(dataRef);

  const porTipoEregra = new Map<string, number>();
  for (const r of registros) {
    const chave =
      r.tipo === "tempo_logado" ? "tempo_logado" : `pausa:${r.reason_code}`;
    porTipoEregra.set(chave, (porTipoEregra.get(chave) ?? 0) + 1);
  }

  console.log("total de registros:", registros.length);
  console.log("agentes distintos com registro:", new Set(registros.map((r) => r.agent_user)).size);
  console.log("\npor reason_code / tipo:");
  for (const [k, v] of [...porTipoEregra.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  const regra2 = registros.filter((r) => r.reason_code === "Pausa 20");
  const regra3 = registros.filter((r) => r.reason_code === "Pausa 10");
  const regra4 = registros.filter((r) => r.tipo === "tempo_logado");

  console.log("\n--- Regra 2 (Pausa 20 > 25min), amostra: ---");
  for (const r of regra2.slice(0, 5)) {
    console.log(`  ${r.agent_user} (${r.agent_name}) — ${r.tempo_seg}s = ${(r.tempo_seg / 60).toFixed(1)}min`);
  }

  console.log("\n--- Regra 3 (Pausa 10 soma > 25min), amostra: ---");
  for (const r of regra3.slice(0, 5)) {
    console.log(`  ${r.agent_user} (${r.agent_name}) — ${r.tempo_seg}s = ${(r.tempo_seg / 60).toFixed(1)}min`);
  }

  console.log("\n--- Regra 4 (tempo logado < 6:20:00), amostra: ---");
  for (const r of regra4.slice(0, 5)) {
    const h = Math.floor(r.tempo_seg / 3600);
    const m = Math.floor((r.tempo_seg % 3600) / 60);
    const s = r.tempo_seg % 60;
    console.log(`  ${r.agent_user} (${r.agent_name}) — ${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} logado (limiar: ${TEMPO_LOGADO_MINIMO_SEG}s)`);
  }

  console.log("\n--- Regra 1 (pausas da lista > 1min), amostra: ---");
  const regra1 = registros.filter((r) => r.tipo === "pausa" && r.reason_code !== "Pausa 20" && r.reason_code !== "Pausa 10");
  for (const r of regra1.slice(0, 8)) {
    console.log(`  ${r.agent_user} — ${r.reason_code} — ${r.tempo_seg}s`);
  }
  console.log("total regra1:", regra1.length);

  // Sanity check: reaplicar as regras em memória (sem passar pelo banco) e
  // comparar contagem total, pra confirmar que salvar+ler não perdeu nada.
  const linhasParaMotor = parseResult.linhas.map((l) => ({
    agent_user: l.agent_user,
    agent_name: l.agent_name,
    state: l.state,
    reason_code: l.reason_code,
    login_time_seg: l.login_time_seg,
    agent_state_time_seg: l.agent_state_time_seg,
  }));
  const registrosEmMemoria = aplicarRegrasDetecao(dataRef, linhasParaMotor);
  console.log(
    "\nsanity check — registros direto da memória (parse, sem round-trip no banco):",
    registrosEmMemoria.length,
    registrosEmMemoria.length === registros.length ? "BATEU com o banco" : "DIVERGIU do banco!",
  );
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
