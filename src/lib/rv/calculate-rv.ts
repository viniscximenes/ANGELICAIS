import type {
  BinaryResult,
  BonusConditionResult,
  CombinedBonusResult,
  DeflatorResult,
  RvCalculation,
  TieredResult,
} from "./calc-types";
import { compareValues, isCondicaoEstouradaIrreversivel } from "./compare";
import type { DeflatorApplication, Faixa, FullRuleSet } from "./types";

function normalizeStatus(s: string | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
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

  const combinedBonusResults: CombinedBonusResult[] = [];
  let valorTravadoImpossivel = 0;

  for (const cb of ruleSet.combinedBonus) {
    const conditionResults: BonusConditionResult[] = cb.conditions.map((c) => {
      const valor = valuesBySlug.get(c.kpiSlug) ?? null;
      return {
        kpiSlug: c.kpiSlug,
        comparison: c.comparison,
        threshold: c.threshold,
        valorAtual: valor,
        atingiu: compareValues(valor, c.comparison, c.threshold),
      };
    });

    const todasAtingidas = conditionResults.every((r) => r.atingiu);

    let ainda_possivel = true;
    let motivoImpossivel: string | null = null;

    for (const c of cb.conditions) {
      const valor = valuesBySlug.get(c.kpiSlug) ?? null;
      if (isCondicaoEstouradaIrreversivel(valor, c.comparison, c.threshold)) {
        ainda_possivel = false;
        motivoImpossivel = `${c.kpiSlug} já estourou (valor atual: ${valor}, precisava: ${c.comparison} ${c.threshold})`;
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
      const apps = deflatorApplications.filter(
        (a) => a.deflatorTypeId === dt.id,
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
    deflatorResults,
  };
}
