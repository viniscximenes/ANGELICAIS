"use client";

import { useState, useTransition } from "react";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { KpiMetaGestor } from "@/lib/kpi/gestor/get-metas-gestor";
import { updateMetaGestorAction } from "@/lib/kpi/gestor/update-meta-gestor-action";

type NonPerRowColoring = "three_tier" | "binary" | "none";

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

function resolveInitialColoring(meta: KpiMetaGestor): NonPerRowColoring {
  if (
    meta.coloringType === "three_tier" ||
    meta.coloringType === "binary" ||
    meta.coloringType === "none"
  ) {
    return meta.coloringType;
  }
  // per_row → suggest binary as starting point
  return "binary";
}

interface KpiMetaGestorCardProps {
  meta: KpiMetaGestor;
}

export function KpiMetaGestorCard({ meta }: KpiMetaGestorCardProps) {
  const isTime = meta.valueType === "time";
  const isDiffMode = meta.thresholdDiffPercent !== null;
  const wasPerRow = !isDiffMode && meta.coloringType === "per_row";

  const [coloringType, setColoringType] = useState<NonPerRowColoring>(
    () => resolveInitialColoring(meta),
  );

  const [thresholdRed, setThresholdRed] = useState<string>(
    meta.thresholdRed === null
      ? ""
      : isTime
        ? secondsToTime(meta.thresholdRed)
        : String(meta.thresholdRed),
  );
  const [thresholdYellow, setThresholdYellow] = useState<string>(
    meta.thresholdYellow === null
      ? ""
      : isTime
        ? secondsToTime(meta.thresholdYellow)
        : String(meta.thresholdYellow),
  );
  const [thresholdDiff, setThresholdDiff] = useState<string>(
    meta.thresholdDiffPercent === null
      ? ""
      : String(meta.thresholdDiffPercent),
  );

  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      if (isDiffMode) {
        const parsed = parseFloat(thresholdDiff.replace(",", "."));
        if (isNaN(parsed) || parsed <= 0) {
          toast.error("Diferença máxima deve ser positiva");
          return;
        }
        const result = await updateMetaGestorAction({
          slug: meta.slug,
          thresholdRed: null,
          thresholdYellow: null,
          thresholdDiffPercent: parsed,
          coloringType: meta.coloringType,
        });
        if (result.success) {
          toast.success("Salvo");
        } else {
          toast.error(result.error);
        }
        return;
      }

      let redNum: number | null = null;
      let yellowNum: number | null = null;

      if (coloringType === "three_tier") {
        if (isTime) {
          redNum = timeToSeconds(thresholdRed);
          if (redNum === null) {
            toast.error("Formato inválido. Use HH:MM:SS");
            return;
          }
        } else {
          const parsed = parseFloat(thresholdRed.replace(",", "."));
          if (isNaN(parsed)) {
            toast.error("Valor vermelho inválido");
            return;
          }
          redNum = parsed;
        }

        const yParsed = parseFloat(thresholdYellow.replace(",", "."));
        if (isNaN(yParsed)) {
          toast.error("Valor verde inválido");
          return;
        }
        yellowNum = yParsed;
      } else if (coloringType === "binary") {
        if (isTime) {
          redNum = timeToSeconds(thresholdRed);
          if (redNum === null) {
            toast.error("Formato inválido. Use HH:MM:SS");
            return;
          }
        } else {
          const parsed = parseFloat(thresholdRed.replace(",", "."));
          if (isNaN(parsed)) {
            toast.error("Valor de meta inválido");
            return;
          }
          redNum = parsed;
        }
      }

      const result = await updateMetaGestorAction({
        slug: meta.slug,
        thresholdRed: redNum,
        thresholdYellow: yellowNum,
        thresholdDiffPercent: null,
        coloringType,
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
          <span className="ds-mono text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {String(meta.displayOrder).padStart(2, "0")}
          </span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h3 className="ds-h2" style={{ fontSize: "1.25rem" }}>
            {meta.displayName}
          </h3>
        </div>
      </div>

      {wasPerRow && (
        <div
          className="flex items-start gap-2 rounded-md p-3"
          style={{
            background: "color-mix(in oklch, var(--warning) 12%, transparent)",
            border:
              "1px solid color-mix(in oklch, var(--warning) 35%, transparent)",
          }}
        >
          <IconAlertTriangle
            size={16}
            style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
            Herdado do operador como{" "}
            <span className="font-semibold">meta por linha</span> (forecast
            individual). Selecione a coloração e defina as metas abaixo.
          </p>
        </div>
      )}

      {isDiffMode ? (
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
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`coloring-${meta.slug}`}
              className="ds-mono-sm text-muted-foreground mb-1 block"
            >
              Tipo de coloração
            </label>
            <select
              id={`coloring-${meta.slug}`}
              value={coloringType}
              onChange={(e) =>
                setColoringType(e.target.value as NonPerRowColoring)
              }
              disabled={isPending}
              className="elevation-2 ds-mono rounded-md px-3 py-2"
              style={{
                border: "1px solid var(--border)",
                colorScheme: "dark",
                minWidth: "180px",
              }}
            >
              <option value="three_tier">3 faixas</option>
              <option value="binary">Binária</option>
              <option value="none">Sem cor</option>
            </select>
          </div>

          {coloringType === "three_tier" && (
            <div className="space-y-3">
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

          {coloringType === "binary" && (
            <div className="space-y-3">
              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, background: "var(--success)" }}
                    aria-hidden="true"
                  />
                  Verde se valor{" "}
                  {meta.direction === "lower_better" ? "≤" : "≥"}
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

          {coloringType === "none" && (
            <p className="ds-mono-sm text-muted-foreground">
              Apenas exibido como valor numérico, sem destaque de cor.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending && (
            <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
