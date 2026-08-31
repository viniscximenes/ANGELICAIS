import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import { SLUGS_SOMENTE_ESPELHO } from "@/lib/kpi/detalhado/colunas-kpi-detalhado";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import type { KpiDefinition, KpiValueType } from "@/lib/kpi/types";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

import { PRINCIPAIS_SLUGS, TX_RETENCAO_SLUG } from "./constants";
import { formatMesRefCurto } from "./format-mes-ref";
import { getHistoricoOperador } from "./get-historico-operador";
import {
  classificarStatusOperadorMes,
  foraDeOperacao,
  rotuloMetaStatus,
  type StatusOperadorMes,
} from "./meta-status";
import {
  getQuartisHistoricoOperador,
  type QuartilPonto,
} from "./get-quartis-historico";
import { resolveJanela, type Periodo } from "./periodo";

type StatusKpi = "success" | "warning" | "danger" | "neutral";

export type PontoSerie = {
  mesRef: string;
  label: string;
  /** Valor bruto do mês (sempre presente se houver dado — usado no tooltip). */
  valor: number | null;
  /**
   * Valor a PLOTAR: igual a `valor`, exceto em meses fora de operação
   * (férias/afastamento/desligado) onde vira null → gap no gráfico, fora da
   * média. O valor bruto continua em `valor` para o tooltip.
   */
  valorPlot: number | null;
  status: StatusKpi;
  /** GRUPO interno do status do operador no mês (só p/ decidir exclusão de média/quartil e cor). */
  statusOperador: StatusOperadorMes;
  /**
   * Texto EXIBIDO no marcador — mapeado 1:1 do meta_status ORIGINAL do mês
   * ("Férias", "Afastamento", "Afastamento (Previdência)", "Licença",
   * "Licença Maternidade", "Movimentação", "Desligado"). null = mês ativo.
   */
  metaStatusRotulo: string | null;
  /** Meta "por linha" quando o KPI é per_row (pedidos → forecast_pedidos, churn → forecast_churn). */
  metaPonto: number | null;
  /** Q1 (melhor) … Q4 (pior). null quando o KPI não é ranqueável, o operador não tem valor, ou está fora de operação no mês. */
  quartil: 1 | 2 | 3 | 4 | null;
};

export type KpiSerie = {
  slug: string;
  displayName: string;
  valueType: KpiValueType;
  direction: KpiDefinition["direction"];
  grupo: "principal" | "secundario";
  /** Linha de referência fixa (binary → threshold_red; three_tier → threshold_yellow). null quando não se aplica. */
  metaLinha: number | null;
  /** true para KPIs principais ranqueáveis (higher_better | lower_better) — os que exibem faixa de quartil. */
  temQuartil: boolean;
  pontos: PontoSerie[];
};

export type AnaliseOperadorSerial = {
  operatorEmail: string;
  periodo: Periodo;
  /** Meses (YYYY-MM-01) exibidos, em ordem crescente. Já respeita `incluirMesAtual`. */
  meses: string[];
  mesMaisRecenteDisponivel: string | null;
  /** Mês calendário corrente (YYYY-MM-01, Brasília) — o "mês atual ainda não fechado". */
  mesAtualRef: string;
  /** Se o mês atual estava entre os dados do período (antes de eventual exclusão). */
  mesAtualTinhaDado: boolean;
  incluirMesAtual: boolean;
  /** Meta de tx_retencao_bruta efetivamente aplicada (override do gestor OU threshold padrão). */
  metaTxRetencao: number | null;
  /** true quando `metaTxRetencao` veio do override desta página (não do kpi_definitions). */
  metaTxRetencaoEhOverride: boolean;
  /** Threshold padrão de tx_retencao_bruta em kpi_definitions (para o "usar padrão"). */
  metaTxRetencaoPadrao: number | null;
  principais: KpiSerie[];
  secundarios: KpiSerie[];
};

export { TX_RETENCAO_SLUG } from "./constants";

/** `YYYY-MM-01` do mês calendário corrente em Brasília. */
export function mesRefAtual(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function metaLinhaDaDefinicao(def: KpiDefinition): number | null {
  if (def.coloringType === "binary") return def.thresholdRed;
  if (def.coloringType === "three_tier") {
    return def.thresholdYellow ?? def.thresholdRed;
  }
  return null;
}

function isRanqueavel(def: KpiDefinition): boolean {
  return def.direction === "higher_better" || def.direction === "lower_better";
}

/**
 * Monta o payload serializável do relatório de um operador: para cada KPI
 * (principais e secundários de kpi_definitions), a série mensal de valor +
 * status (mesmo semáforo do resto do site, via enrichWithDefinitions) e,
 * nos principais ranqueáveis, o quartil do operador naquele mês contra
 * TODOS os operadores da empresa.
 *
 * Reaproveitado pelo Server Component (carga inicial) e pela Server Action
 * (troca de seletor) — a lógica de agregação mora aqui, não duplicada.
 */
export async function buildAnaliseOperadorSerial(params: {
  operatorEmailCandidates: string[];
  periodo: Periodo;
  mesMaisRecenteDisponivel: string | null;
  /** default true — inclui o mês calendário corrente (ainda não fechado) no histórico/quartil/média. */
  incluirMesAtual?: boolean;
  /** Override de meta de tx_retencao_bruta desta página (null = usa kpi_definitions). */
  metaOverrideTxRetencao?: number | null;
}): Promise<AnaliseOperadorSerial> {
  const { operatorEmailCandidates, periodo, mesMaisRecenteDisponivel } = params;
  const incluirMesAtual = params.incluirMesAtual ?? true;
  const metaOverrideTxRetencao = params.metaOverrideTxRetencao ?? null;
  const mesAtualRef = mesRefAtual();

  const primaryEmail = operatorEmailCandidates[0] ?? "";

  if (!mesMaisRecenteDisponivel) {
    return {
      operatorEmail: primaryEmail,
      periodo,
      meses: [],
      mesMaisRecenteDisponivel: null,
      mesAtualRef,
      mesAtualTinhaDado: false,
      incluirMesAtual,
      metaTxRetencao: metaOverrideTxRetencao,
      metaTxRetencaoEhOverride: metaOverrideTxRetencao !== null,
      metaTxRetencaoPadrao: null,
      principais: [],
      secundarios: [],
    };
  }

  // Janela de N meses. O toggle desliza o FIM (inclui ou não o mês atual) —
  // não corta um mês de uma janela fixa. `meses` é a sequência completa de
  // N meses; a mesma janela alimenta histórico, quartil e média.
  const janela = resolveJanela({
    mesMaisRecenteDisponivel,
    periodo,
    incluirMesAtual,
    mesAtualRef,
  });
  const definitions = await getKpiDefinitions();

  // Split LOCAL desta feature (PRINCIPAIS_SLUGS), não kpi_definitions.group_type.
  const ordemPrincipal = (slug: string) => {
    const i = PRINCIPAIS_SLUGS.indexOf(slug);
    return i === -1 ? 999 : i;
  };
  // Ignora os slugs que existem só para o espelho de /operacao/kpi-detalhado.
  const defsRelevantes = definitions.filter(
    (d) => !SLUGS_SOMENTE_ESPELHO.has(d.slug),
  );
  const principaisDefs = defsRelevantes
    .filter((d) => PRINCIPAIS_SLUGS.includes(d.slug))
    .sort((a, b) => ordemPrincipal(a.slug) - ordemPrincipal(b.slug));
  const secundariosDefs = defsRelevantes
    .filter((d) => !PRINCIPAIS_SLUGS.includes(d.slug))
    // Nativos de group_type "secundario" primeiro (na ordem deles); os
    // rebaixados daqui (pedidos/churn/variacao_ticket) vão para o fim.
    .sort((a, b) => {
      const ga = a.groupType === "secundario" ? 0 : 1;
      const gb = b.groupType === "secundario" ? 0 : 1;
      return ga - gb || a.displayOrder - b.displayOrder;
    });
  const ranqueaveisDefs = principaisDefs.filter(isRanqueavel);

  const [historico, quartis] = await Promise.all([
    getHistoricoOperador({
      operatorEmailCandidates,
      mesRefInicial: janela.inicio,
      mesRefFinal: janela.fim,
    }),
    getQuartisHistoricoOperador({
      operatorEmailCandidates,
      mesRefInicial: janela.inicio,
      mesRefFinal: janela.fim,
      ranqueaveisDefs,
    }),
  ]);

  // Sempre N meses (a sequência completa da janela), mesmo os sem snapshot
  // (viram gap no gráfico). O toggle já deslizou a janela em resolveJanela.
  const meses = janela.meses;
  const mesAtualTinhaDado = historico.porMes.has(mesAtualRef);

  const txDef = definitions.find((d) => d.slug === TX_RETENCAO_SLUG) ?? null;
  const metaTxRetencaoPadrao = txDef ? metaLinhaDaDefinicao(txDef) : null;
  const metaTxRetencao = metaOverrideTxRetencao ?? metaTxRetencaoPadrao;

  const buildSerie = (
    def: KpiDefinition,
    grupo: "principal" | "secundario",
  ): KpiSerie => {
    const ranqueavel = grupo === "principal" && isRanqueavel(def);

    // Override de meta só do tx_retencao_bruta desta página: troca a
    // ReferenceLine e recalcula o semáforo do card (binário vs. o override).
    const usaOverride =
      def.slug === TX_RETENCAO_SLUG && metaOverrideTxRetencao !== null;
    const metaLinha = usaOverride
      ? metaOverrideTxRetencao
      : metaLinhaDaDefinicao(def);

    const pontos: PontoSerie[] = meses.map((mesRef) => {
      const valuesBySlug = historico.porMes.get(mesRef) ?? new Map();
      const metaStatusRaw = historico.statusPorMes.get(mesRef);
      const statusOperador = classificarStatusOperadorMes(metaStatusRaw);
      const metaStatusRotulo = rotuloMetaStatus(metaStatusRaw);
      const mesForaDeOperacao = foraDeOperacao(statusOperador);

      // Status/semáforo pelo group_type REAL da definição (não pelo split
      // local): pedidos/churn/variacao_ticket viram "secundários" nesta tela
      // mas continuam com o mesmo cálculo de cor do resto do site.
      const enriched = enrichWithDefinitions(
        definitions,
        valuesBySlug,
        {
          forecastPedidos: valuesBySlug.get("forecast_pedidos") ?? null,
          forecastChurn: valuesBySlug.get("forecast_churn") ?? null,
          txRetencaoBruta: valuesBySlug.get("tx_retencao_bruta") ?? null,
        },
        def.groupType,
      );
      const cell = enriched.get(def.slug);

      const quartilMes: QuartilPonto | undefined = ranqueavel
        ? quartis.get(mesRef)?.get(def.slug)
        : undefined;

      const valor = cell?.valor ?? valuesBySlug.get(def.slug) ?? null;
      const status: PontoSerie["status"] = usaOverride
        ? valor === null
          ? "neutral"
          : valor >= (metaOverrideTxRetencao as number)
            ? "success"
            : "danger"
        : (cell?.status ?? "neutral");

      return {
        mesRef,
        label: formatMesRefCurto(mesRef),
        valor,
        valorPlot: mesForaDeOperacao ? null : valor,
        status,
        statusOperador,
        metaStatusRotulo,
        metaPonto: cell?.metaPorLinha ?? null,
        quartil: mesForaDeOperacao || !quartilMes ? null : quartilMes.quartil,
      };
    });

    return {
      slug: def.slug,
      displayName: def.displayName,
      valueType: def.valueType,
      direction: def.direction,
      grupo,
      metaLinha,
      temQuartil: ranqueavel,
      pontos,
    };
  };

  return {
    operatorEmail: primaryEmail,
    periodo,
    meses,
    mesMaisRecenteDisponivel,
    mesAtualRef,
    mesAtualTinhaDado,
    incluirMesAtual,
    metaTxRetencao,
    metaTxRetencaoEhOverride: metaOverrideTxRetencao !== null,
    metaTxRetencaoPadrao,
    principais: principaisDefs.map((d) => buildSerie(d, "principal")),
    secundarios: secundariosDefs.map((d) => buildSerie(d, "secundario")),
  };
}
