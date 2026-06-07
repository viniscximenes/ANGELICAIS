import type {
  BinaryResult,
  BonusConditionResult,
  CombinedBonusResult,
  DeflatorResult,
  PerUnitResult,
  RvCalculation,
  TieredResult,
} from "./calc-types";
import { compareValues, isCondicaoEstouradaIrreversivel } from "./compare";
import type {
  DeflatorApplication,
  Faixa,
  FullRuleSet,
  PerUnitFaixa,
} from "./types";

function normalizeStatus(s: string | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * KPIs "monotônicos": só crescem no mês, não voltam.
 * - churn: contagem absoluta de cancelamentos (definitivo)
 * - deflator:*: ocorrências aplicadas (advertência, suspensão, etc) —
 *   o operador não reverte por desempenho
 * Percentuais e médias (tx, tma, indisp) NÃO são monotônicos: oscilam e
 * podem recuperar, então nunca são "irreversíveis".
 */
function isSlugMonotonico(slug: string): boolean {
  return slug === "churn" || slug.startsWith("deflator:");
}

function mensagemIndisponibilidade(statusOriginal: string): string {
  const norm = normalizeStatus(statusOriginal);

  if (norm === "ferias") return `Operador em férias neste mês — RV não aplicável`;
  if (norm === "desligado") return `Operador desligado — RV não aplicável`;
  if (norm === "licenca") return `Operador em licença — RV não aplicável`;
  return `Status do operador: ${statusOriginal} — RV não calculado`;
}

/**
 * Faixa de MAIOR valor que o valor atual atinge, conforme direção.
 */
function findFaixaAtingida(
  valor: number | null,
  faixas: Faixa[],
  direction: "higher_better" | "lower_better" | "closer_to_zero",
): Faixa | null {
  if (valor === null) return null;
  if (faixas.length === 0) return null;

  const sorted = [...faixas].sort((a, b) => b.value - a.value);

  for (const faixa of sorted) {
    let atinge = false;

    if (direction === "higher_better") {
      atinge = valor >= faixa.threshold;
    } else if (direction === "lower_better") {
      atinge = valor <= faixa.threshold;
    } else if (direction === "closer_to_zero") {
      // Variação Ticket é negativa por natureza. "-6%" atinge "-6%" se
      // valor >= threshold (ou seja, mais perto de 0).
      atinge = valor >= faixa.threshold;
    }

    if (atinge) return faixa;
  }

  return null;
}

/**
 * Próxima faixa imediatamente acima da atual (em valor de pagamento).
 */
function findProximaFaixa(
  faixaAtual: Faixa | null,
  faixas: Faixa[],
): Faixa | null {
  const sorted = [...faixas].sort((a, b) => a.value - b.value);

  if (!faixaAtual) {
    return sorted[0] ?? null;
  }

  const idx = sorted.findIndex((f) => f.value === faixaAtual.value);
  if (idx === -1 || idx === sorted.length - 1) return null;
  return sorted[idx + 1];
}

/**
 * Faixa de TX atingida: maior threshold que a TX alcança.
 */
function findPerUnitFaixa(
  tx: number | null,
  faixas: PerUnitFaixa[],
): PerUnitFaixa | null {
  if (tx === null) return null;
  // Ordena por threshold desc, pega a primeira que a TX atinge
  const sorted = [...faixas].sort((a, b) => b.threshold - a.threshold);
  for (const f of sorted) {
    if (tx >= f.threshold) return f;
  }
  return null;
}

/**
 * Próxima faixa de TX imediatamente acima da atual (pra mostrar potencial).
 */
function findProximaPerUnitFaixa(
  faixaAtual: PerUnitFaixa | null,
  faixas: PerUnitFaixa[],
): PerUnitFaixa | null {
  const sorted = [...faixas].sort((a, b) => a.threshold - b.threshold);
  if (!faixaAtual) return sorted[0] ?? null;
  const idx = sorted.findIndex((f) => f.threshold === faixaAtual.threshold);
  if (idx === -1 || idx === sorted.length - 1) return null;
  return sorted[idx + 1];
}

/**
 * Cálculo puro de RV. Não toca em Supabase — só recebe dados.
 */
export function calculateRv(
  valuesBySlug: Map<string, number | null>,
  operatorStatus: string | null,
  ruleSet: FullRuleSet,
  deflatorApplications: DeflatorApplication[],
): RvCalculation {
  // ─── ETAPA 0: status do operador ───
  const statusNorm = normalizeStatus(operatorStatus);
  if (statusNorm && statusNorm !== "ativo") {
    return {
      status: "indisponivel_status",
      motivoIndisponibilidade: {
        status: operatorStatus ?? "",
        mensagem: mensagemIndisponibilidade(operatorStatus ?? ""),
      },
      bruto: 0,
      multiplicadorPedidos: 0,
      subtotal: 0,
      somaDescontosPct: 0,
      liquido: 0,
      tetoBase: ruleSet.ruleSet.tetoBase,
      tetoPossivel: 0,
      valorTravadoImpossivel: 0,
      tieredResults: [],
      binaryResults: [],
      combinedBonusResults: [],
      perUnitResults: [],
      deflatorResults: [],
    };
  }

  // ─── ETAPA 1: elegibilidade ───
  for (const rule of ruleSet.eligibility) {
    // Regras sem kpi_slug ainda não têm fonte de dados (ex.: tempo_logado_pct
    // e suspensão não estão no snapshot atual). Tratadas como atendidas
    // até a infraestrutura cobrir.
    if (rule.kpiSlug === null) continue;

    const valor = valuesBySlug.get(rule.kpiSlug) ?? null;
    const passou = compareValues(valor, rule.comparison, rule.threshold);

    if (!passou) {
      return {
        status: "nao_elegivel",
        motivoNaoElegivel: `Não atendeu: ${rule.displayName}`,
        bruto: 0,
        multiplicadorPedidos: 0,
        subtotal: 0,
        somaDescontosPct: 0,
        liquido: 0,
        tetoBase: ruleSet.ruleSet.tetoBase,
        tetoPossivel: 0,
        valorTravadoImpossivel: 0,
        tieredResults: [],
        binaryResults: [],
        combinedBonusResults: [],
        perUnitResults: [],
        deflatorResults: [],
      };
    }
  }

  // ─── ETAPA 2: bruto ───
  let bruto = 0;

  const tieredResults: TieredResult[] = [];
  for (const ti of ruleSet.tiered) {
    const valor = valuesBySlug.get(ti.kpiSlug) ?? null;

    let preRequisitoAtendido = true;
    if (ti.requiresIndicatorSlug && ti.requiresThreshold !== null) {
      const requiredTi = ruleSet.tiered.find(
        (t) => t.slug === ti.requiresIndicatorSlug,
      );
      if (requiredTi) {
        const reqValor = valuesBySlug.get(requiredTi.kpiSlug) ?? null;
        if (reqValor === null || reqValor < ti.requiresThreshold) {
          preRequisitoAtendido = false;
        }
      }
    }

    const faixaAtingida = preRequisitoAtendido
      ? findFaixaAtingida(valor, ti.faixas, ti.direction)
      : null;
    const valorGanho = faixaAtingida ? faixaAtingida.value : 0;
    const proximaFaixa = findProximaFaixa(faixaAtingida, ti.faixas);

    bruto += valorGanho;

    tieredResults.push({
      indicator: ti,
      valorAtual: valor,
      faixaAtingida,
      valorGanho,
      preRequisitoAtendido,
      proximaFaixa,
    });
  }

  const binaryResults: BinaryResult[] = [];
  for (const bi of ruleSet.binary) {
    const valor = valuesBySlug.get(bi.kpiSlug) ?? null;
    const atingiu = compareValues(valor, bi.comparison, bi.threshold);
    const valorGanho = atingiu ? bi.valueIfAchieved : 0;

    bruto += valorGanho;

    binaryResults.push({
      indicator: bi,
      valorAtual: valor,
      atingiu,
      valorGanho,
    });
  }

  // Pseudo-KPIs: contagem de cada deflator manual, pra permitir condições
  // de bônus tipo "0 advertência". Casa por display_name normalizado
  // ("Advertência" → "advertencia"), então uma condition com
  // kpiSlug "deflator:advertencia" e comparison lte/eq contra 0 funciona
  // como qualquer outra. Sobrevive à promoção (display_name é copiado).
  for (const dt of ruleSet.deflatorTypes) {
    if (dt.isAuto) continue;
    const ocorr = deflatorApplications
      .filter((a) => a.deflatorTypeId === dt.id)
      .reduce((s, a) => s + a.occurrenceCount, 0);
    // Usa o slug estável; durante a transição (slug vazio, pré-backfill) cai
    // no nome normalizado — que pra "Advertência" dá o mesmo "advertencia".
    const dSlug = dt.slug || normalizeStatus(dt.displayName);
    valuesBySlug.set(`deflator:${dSlug}`, ocorr);
  }

  const combinedBonusResults: CombinedBonusResult[] = [];
  let valorTravadoImpossivel = 0;

  for (const cb of ruleSet.combinedBonus) {
    const conditionResults: BonusConditionResult[] = cb.conditions.map((c) => {
      const valor = valuesBySlug.get(c.kpiSlug) ?? null;

      const effectiveThreshold = c.thresholdKpiSlug
        ? (valuesBySlug.get(c.thresholdKpiSlug) ?? null)
        : c.threshold;

      const atingiu =
        effectiveThreshold !== null &&
        compareValues(valor, c.comparison, effectiveThreshold);

      return {
        kpiSlug: c.kpiSlug,
        comparison: c.comparison,
        threshold: effectiveThreshold ?? c.threshold,
        valorAtual: valor,
        atingiu,
      };
    });

    const todasAtingidas = conditionResults.every((r) => r.atingiu);

    let ainda_possivel = true;
    let motivoImpossivel: string | null = null;

    for (const c of cb.conditions) {
      const valor = valuesBySlug.get(c.kpiSlug) ?? null;

      const effectiveThreshold = c.thresholdKpiSlug
        ? (valuesBySlug.get(c.thresholdKpiSlug) ?? null)
        : c.threshold;

      if (effectiveThreshold === null) continue;

      // Só KPIs monotônicos (churn, deflatores) podem ser "irreversíveis".
      // Percentuais/médias (tx, tma, indisp) sempre podem recuperar.
      if (!isSlugMonotonico(c.kpiSlug)) continue;

      if (
        isCondicaoEstouradaIrreversivel(valor, c.comparison, effectiveThreshold)
      ) {
        ainda_possivel = false;
        motivoImpossivel = `${c.kpiSlug} já estourou (valor atual: ${valor}, precisava: ${c.comparison} ${effectiveThreshold})`;
        break;
      }
    }

    const valorGanho = todasAtingidas ? cb.valueIfAllAchieved : 0;
    bruto += valorGanho;

    if (!ainda_possivel) {
      valorTravadoImpossivel += cb.valueIfAllAchieved;
    }

    combinedBonusResults.push({
      bonus: cb,
      conditionResults,
      todasAtingidas,
      ainda_possivel,
      motivoImpossivel,
      valorGanho,
    });
  }

  // ─── ETAPA 2.b: per-unit (valor por retido) ───
  // Aditiva e condicional: só roda se houver per-unit indicators. Maio
  // (previous) não tem rows, então perUnitIndicators vem [] e o bruto não muda.
  const perUnitResults: PerUnitResult[] = [];
  for (const pu of ruleSet.perUnitIndicators) {
    const tx = valuesBySlug.get(pu.txKpiSlug) ?? null;

    // Contagem de retidos: derived_retido = pedidos - churn
    let contagemRetidos = 0;
    if (pu.countSource === "derived_retido") {
      const pedidos = valuesBySlug.get("pedidos") ?? 0;
      const churn = valuesBySlug.get("churn") ?? 0;
      contagemRetidos = Math.max((pedidos ?? 0) - (churn ?? 0), 0);
    } else {
      // fallback: tenta ler countSource como slug direto
      contagemRetidos = valuesBySlug.get(pu.countSource) ?? 0;
    }

    const faixaAtingida = findPerUnitFaixa(tx, pu.faixas);
    const valorPorRetido = faixaAtingida ? faixaAtingida.value : 0;
    const valorGanho = valorPorRetido * contagemRetidos;
    const proximaFaixa = findProximaPerUnitFaixa(faixaAtingida, pu.faixas);

    bruto += valorGanho;

    perUnitResults.push({
      indicator: pu,
      txAtual: tx,
      faixaAtingida,
      valorPorRetido,
      contagemRetidos,
      valorGanho,
      proximaFaixa,
    });
  }

  // ─── ETAPA 3: multiplicador ───
  let multiplicadorPedidos = 1;
  if (ruleSet.multiplier) {
    const m = ruleSet.multiplier;
    const valor = valuesBySlug.get(m.kpiSlug) ?? null;
    const forecast = valuesBySlug.get(m.forecastKpiSlug) ?? null;

    if (valor !== null && forecast !== null && forecast > 0) {
      multiplicadorPedidos = valor / forecast;
      if (m.capAt100Pct && multiplicadorPedidos > 1) {
        multiplicadorPedidos = 1;
      }
    } else {
      multiplicadorPedidos = 0;
    }
  }

  const subtotal = bruto * multiplicadorPedidos;

  // ─── ETAPA 4: deflatores ───
  const deflatorResults: DeflatorResult[] = [];
  let somaDescontosPct = 0;

  for (const dt of ruleSet.deflatorTypes) {
    let ocorrencias = 0;
    let origem: "automatico" | "manual" = "manual";

    if (
      dt.isAuto &&
      dt.autoFromKpiSlug &&
      dt.autoComparison &&
      dt.autoThreshold !== null
    ) {
      origem = "automatico";
      const valor = valuesBySlug.get(dt.autoFromKpiSlug) ?? null;
      const dispara = compareValues(valor, dt.autoComparison, dt.autoThreshold);
      ocorrencias = dispara ? 1 : 0;
    } else {
      // Casa por slug estável (sobrevive à promoção, que regenera o id).
      // Fallback pro id antigo enquanto o backfill do deflator_slug não rodou.
      const apps = deflatorApplications.filter(
        (a) =>
          (a.deflatorSlug && dt.slug && a.deflatorSlug === dt.slug) ||
          a.deflatorTypeId === dt.id,
      );
      ocorrencias = apps.reduce((sum, a) => sum + a.occurrenceCount, 0);
    }

    let percentTotal = 0;
    if (ocorrencias > 0) {
      percentTotal =
        dt.initialPercent + (ocorrencias - 1) * dt.incrementPerOccurrence;
      somaDescontosPct += percentTotal;
    }

    deflatorResults.push({
      deflatorType: dt,
      ocorrencias,
      percentTotal,
      origem,
    });
  }

  const fator = Math.max(0, 1 - somaDescontosPct / 100);
  const liquido = subtotal * fator;

  // ─── TETO ───
  const bonusPossivelTotal = ruleSet.combinedBonus.reduce((sum, cb) => {
    const cbResult = combinedBonusResults.find((r) => r.bonus.id === cb.id);
    if (cbResult && cbResult.ainda_possivel) {
      return sum + cb.valueIfAllAchieved;
    }
    return sum;
  }, 0);

  const tetoPossivel = ruleSet.ruleSet.tetoBase + bonusPossivelTotal;

  return {
    status: "ok",
    bruto,
    multiplicadorPedidos,
    subtotal,
    somaDescontosPct,
    liquido,
    tetoBase: ruleSet.ruleSet.tetoBase,
    tetoPossivel,
    valorTravadoImpossivel,
    tieredResults,
    binaryResults,
    combinedBonusResults,
    perUnitResults,
    deflatorResults,
  };
}
