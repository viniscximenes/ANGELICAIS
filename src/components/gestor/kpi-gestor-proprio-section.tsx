"use client";

import { useState } from "react";

import { KpiMediumCard } from "@/components/kpi/atual-principal/kpi-medium-card";
import { TxRetencaoHeroCard } from "@/components/kpi/atual-principal/tx-retencao-hero-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { DefasadosInfo, GestorProprioKpiSerial, GestorProprioSerial } from "@/lib/kpi/gestor/gestor-proprio-types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";
import type { KpiDefinition } from "@/lib/kpi/types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

type Mes = "atual" | "passado";

const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatMesRef(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  return `${MESES_PT[Number(month) - 1]}/${year}`;
}

function toKpiDef(kpi: GestorProprioKpiSerial): KpiDefinition {
  return {
    id: kpi.slug,
    slug: kpi.slug,
    displayName: kpi.displayName,
    groupType: "principal",
    displayOrder: 0,
    valueType: kpi.valueType,
    direction: kpi.direction,
    coloringType: kpi.coloringType,
    thresholdRed: kpi.thresholdRed,
    thresholdYellow: kpi.thresholdYellow,
    thresholdGreen: null,
    thresholdDiffPercent: null,
    metaColumnName: null,
    expectedHeader: kpi.slug,
  };
}

function toEnriched(
  kpi: GestorProprioKpiSerial,
  neutral: boolean,
): EnrichedKpiValue | NeutralKpiValue {
  const definition = toKpiDef(kpi);
  if (neutral) {
    return { definition, valor: kpi.valor };
  }
  return {
    definition,
    valor: kpi.valor,
    metaPorLinha: kpi.metaPorLinha,
    status: kpi.status,
  };
}

interface KpiGestorProprioSectionProps {
  dataAtual: GestorProprioSerial;
  dataPassado: GestorProprioSerial;
  defasadosAtual: Record<string, DefasadosInfo>;
}

export function KpiGestorProprioSection({
  dataAtual,
  dataPassado,
  defasadosAtual,
}: KpiGestorProprioSectionProps) {
  const [mes, setMes] = useState<Mes>("atual");
  const data = mes === "atual" ? dataAtual : dataPassado;
  const neutral = data.isMesPassado || !data.hasData;

  // Tooltips só no mês atual — passado é neutro e não faz sentido mostrar
  // estado atual da equipe em referência a dados históricos do gestor.
  const resolveDefasados = (slug: string): DefasadosInfo | undefined =>
    mes === "atual" ? defasadosAtual[slug] : undefined;

  const heroKpi = data.principais.find((k) => k.slug === "tx_retencao_bruta");
  const restPrincipais = data.principais.filter(
    (k) => k.slug !== "tx_retencao_bruta",
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8">
        {/* Toggle */}
        <div role="tablist" className="elevation-1 inline-flex gap-1 rounded-md p-1">
          {(["atual", "passado"] as Mes[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mes === m}
              onClick={() => setMes(m)}
              type="button"
              className={[
                "ds-small rounded-md px-4 py-1.5 transition-colors",
                mes === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {m === "atual" ? "Mês Atual" : "Mês Passado"}
            </button>
          ))}
        </div>

        {/* Período */}
        <div className="flex items-center gap-3">
          <span className="ds-mono-sm text-muted-foreground">
            {formatMesRef(data.mesRef)}
          </span>
          {data.dataCorte && (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span className="ds-mono-sm text-muted-foreground">
                Dados até {formatDateBR(data.dataCorte)}
              </span>
            </>
          )}
        </div>

        {!data.hasData ? (
          <div
            className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            Nenhum dado encontrado para {formatMesRef(data.mesRef)}.
          </div>
        ) : (
          <div className="space-y-8">
            {heroKpi && (
              <TxRetencaoHeroCard
                kpi={toEnriched(heroKpi, neutral)}
                neutral={neutral}
                defasados={resolveDefasados(heroKpi.slug)}
              />
            )}

            {restPrincipais.length > 0 && (
              <div className="space-y-4">
                <p className="ds-mono-sm text-muted-foreground uppercase tracking-widest">
                  Principais
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {restPrincipais.map((kpi, i) => (
                    <KpiMediumCard
                      key={kpi.slug}
                      kpi={toEnriched(kpi, neutral)}
                      delayIndex={i}
                      neutral={neutral}
                      defasados={resolveDefasados(kpi.slug)}
                    />
                  ))}
                </div>
              </div>
            )}

            {data.secundarios.length > 0 && (
              <div className="space-y-4">
                <p className="ds-mono-sm text-muted-foreground uppercase tracking-widest">
                  Secundários
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {data.secundarios.map((kpi, i) => (
                    <KpiMediumCard
                      key={kpi.slug}
                      kpi={toEnriched(kpi, neutral)}
                      delayIndex={i + restPrincipais.length}
                      neutral={neutral}
                      defasados={resolveDefasados(kpi.slug)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
