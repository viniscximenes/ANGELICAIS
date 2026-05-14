"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { KpiDefinition } from "@/lib/kpi/types";
import { updateKpiDefinitionAction } from "@/lib/kpi/update-definition-action";

interface KpiDefinitionCardProps {
  kpi: KpiDefinition;
}

function secondsToTime(secs: number | null): string {
  if (secs === null) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeToSeconds(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, h, m, s] = match;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

function formatTypeLabel(kpi: KpiDefinition): string {
  const typeMap: Record<KpiDefinition["valueType"], string> = {
    percent: "percentual",
    number: "número",
    time: "tempo HH:MM:SS",
    percent_negative: "percentual (sempre negativo)",
  };

  const dirMap: Record<KpiDefinition["direction"], string> = {
    higher_better: "maior é melhor",
    lower_better: "menor é melhor",
    closer_to_zero: "mais próximo de 0",
    none: "sem direção",
  };

  return `tipo: ${typeMap[kpi.valueType]}  •  ${dirMap[kpi.direction]}`;
}

export function KpiDefinitionCard({ kpi }: KpiDefinitionCardProps) {
  const isTime = kpi.valueType === "time";

  const isDiffMode = kpi.thresholdDiffPercent !== null;

  const [thresholdRed, setThresholdRed] = useState<string>(
    kpi.thresholdRed === null
      ? ""
      : isTime
        ? secondsToTime(kpi.thresholdRed)
        : String(kpi.thresholdRed),
  );
  const [thresholdYellow, setThresholdYellow] = useState<string>(
    kpi.thresholdYellow === null
      ? ""
      : isTime
        ? secondsToTime(kpi.thresholdYellow)
        : String(kpi.thresholdYellow),
  );
  const [thresholdDiff, setThresholdDiff] = useState<string>(
    kpi.thresholdDiffPercent === null ? "" : String(kpi.thresholdDiffPercent),
  );

  const [isPending, startTransition] = useTransition();

  function handleSave() {
    let redNum: number | null = null;
    let yellowNum: number | null = null;
    let diffNum: number | null = null;

    if (isDiffMode) {
      const parsed = parseFloat(thresholdDiff.replace(",", "."));
      if (isNaN(parsed) || parsed <= 0) {
        toast.error("Diferença máxima deve ser positiva");
        return;
      }
      diffNum = parsed;
    } else if (kpi.coloringType === "three_tier") {
      if (isTime) {
        redNum = timeToSeconds(thresholdRed);
        if (redNum === null) {
          toast.error("Formato inválido. Use HH:MM:SS");
          return;
        }
      } else {
        const parsed = parseFloat(thresholdRed.replace(",", "."));
        if (isNaN(parsed)) {
          toast.error("Valor numérico inválido");
          return;
        }
        redNum = parsed;
      }

      const yParsed = parseFloat(thresholdYellow.replace(",", "."));
      if (isNaN(yParsed)) {
        toast.error("Valor amarelo inválido");
        return;
      }
      yellowNum = yParsed;

      if (redNum !== null && yellowNum <= redNum) {
        toast.error("Limite amarelo deve ser maior que vermelho");
        return;
      }
    } else if (kpi.coloringType === "binary") {
      if (isTime) {
        redNum = timeToSeconds(thresholdRed);
        if (redNum === null) {
          toast.error("Formato inválido. Use HH:MM:SS");
          return;
        }
      } else {
        const parsed = parseFloat(thresholdRed.replace(",", "."));
        if (isNaN(parsed)) {
          toast.error("Valor numérico inválido");
          return;
        }
        redNum = parsed;
      }
    }

    startTransition(async () => {
      const result = await updateKpiDefinitionAction({
        id: kpi.id,
        thresholdRed: redNum,
        thresholdYellow: yellowNum,
        thresholdGreen: null,
        thresholdDiffPercent: diffNum,
        expectedHeader: kpi.expectedHeader,
      });

      if (result.success) {
        toast.success("Salvo");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="elevation-1 space-y-4 rounded-xl p-5">
      <div>
        <div className="flex items-baseline gap-3">
          <span
            className="ds-mono text-muted-foreground"
            style={{ fontSize: "0.85rem" }}
          >
            {String(kpi.displayOrder).padStart(2, "0")}
          </span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h3 className="ds-h2" style={{ fontSize: "1.25rem" }}>
            {kpi.displayName}
          </h3>
        </div>
        <p className="ds-mono-sm text-muted-foreground mt-1">
          {formatTypeLabel(kpi)}
        </p>
      </div>

      {isDiffMode && (
        <div className="space-y-3">
          <p className="ds-small text-muted-foreground">
            Coloração: diferença sobre Tx. Retenção Bruta
          </p>

          <div>
            <label className="ds-mono-sm text-muted-foreground mb-1 flex items-center gap-2">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: "var(--success)" }}
                aria-hidden="true"
              />
              Verde se diferença (Tx Bruta − Tx Líquida) ≤
            </label>
            <div className="flex max-w-xs items-center gap-2">
              <input
                type="text"
                value={thresholdDiff}
                onChange={(e) => setThresholdDiff(e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono flex-1 rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
                placeholder="5"
              />
              <span className="ds-mono text-muted-foreground">%</span>
            </div>
          </div>

          <p className="ds-mono-sm text-muted-foreground">
            Caso contrário: vermelho
          </p>
        </div>
      )}

      {!isDiffMode && kpi.coloringType === "three_tier" && (
        <div className="space-y-3">
          <p className="ds-small text-muted-foreground">Coloração: 3 faixas</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="ds-mono-sm text-muted-foreground mb-1 flex items-center gap-2">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: "var(--danger)" }}
                  aria-hidden="true"
                />
                Vermelho se valor abaixo de
              </label>
              <input
                type="text"
                value={thresholdRed}
                onChange={(e) => setThresholdRed(e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
                placeholder={isTime ? "00:00:00" : "0"}
              />
            </div>

            <div>
              <label className="ds-mono-sm text-muted-foreground mb-1 flex items-center gap-2">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: "var(--success)" }}
                  aria-hidden="true"
                />
                Verde se valor acima de
              </label>
              <input
                type="text"
                value={thresholdYellow}
                onChange={(e) => setThresholdYellow(e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
                placeholder={isTime ? "00:00:00" : "0"}
              />
            </div>
          </div>

          <p className="ds-mono-sm text-muted-foreground">
            Entre os dois valores: amarelo
          </p>
        </div>
      )}

      {!isDiffMode && kpi.coloringType === "binary" && (
        <div className="space-y-3">
          <p className="ds-small text-muted-foreground">Coloração: binária</p>

          <div>
            <label className="ds-mono-sm text-muted-foreground mb-1 flex items-center gap-2">
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, background: "var(--success)" }}
                aria-hidden="true"
              />
              Verde se valor {kpi.direction === "lower_better" ? "≤" : "≥"}
            </label>
            <input
              type="text"
              value={thresholdRed}
              onChange={(e) => setThresholdRed(e.target.value)}
              disabled={isPending}
              className="elevation-2 ds-mono w-full max-w-xs rounded-md px-3 py-2"
              style={{ border: "1px solid var(--border)" }}
              placeholder={isTime ? "00:00:00" : "0"}
            />
          </div>

          <p className="ds-mono-sm text-muted-foreground">
            Caso contrário: vermelho
          </p>
        </div>
      )}

      {kpi.coloringType === "per_row" && (
        <div className="space-y-2">
          <p className="ds-small text-muted-foreground">
            Meta por linha (vem da planilha)
          </p>
          <div className="elevation-2 rounded-md p-3">
            <p className="ds-mono-sm text-muted-foreground">
              Coluna usada como meta:
            </p>
            <p className="ds-mono mt-1">{kpi.metaColumnName ?? "—"}</p>
          </div>
          <p className="ds-mono-sm text-muted-foreground">
            A coloração compara linha a linha (valor vs meta da própria linha do
            operador).
          </p>
        </div>
      )}

      {!isDiffMode && kpi.coloringType === "none" && (
        <div className="space-y-2">
          <p className="ds-small text-muted-foreground">Sem coloração</p>
          <p className="ds-mono-sm text-muted-foreground">
            Apenas exibido como valor numérico nos cards.
          </p>
        </div>
      )}

      {(isDiffMode ||
        kpi.coloringType === "binary" ||
        kpi.coloringType === "three_tier") && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && (
              <IconLoader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}
