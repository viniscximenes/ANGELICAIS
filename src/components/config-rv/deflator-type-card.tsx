"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateDeflatorTypeAction } from "@/lib/rv/actions/update-deflator-type";
import type { Comparison, DeflatorType } from "@/lib/rv/types";

interface Props {
  deflator: DeflatorType;
}

const COMPARISONS: { value: Comparison; label: string }[] = [
  { value: "gte", label: "≥" },
  { value: "gt", label: ">" },
  { value: "eq", label: "=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];

export function DeflatorTypeCard({ deflator }: Props) {
  const [displayName, setDisplayName] = useState(deflator.displayName);
  const [initialPct, setInitialPct] = useState(String(deflator.initialPercent));
  const [increment, setIncrement] = useState(
    String(deflator.incrementPerOccurrence),
  );
  const [autoSlug, setAutoSlug] = useState(deflator.autoFromKpiSlug ?? "");
  const [autoCmp, setAutoCmp] = useState<Comparison>(
    deflator.autoComparison ?? "gt",
  );
  const [autoT, setAutoT] = useState(
    deflator.autoThreshold !== null ? String(deflator.autoThreshold) : "",
  );
  const [isPending, startTransition] = useTransition();

  const isAutoMode = autoSlug.trim().length > 0;

  function handleSave() {
    const initialNum = parseFloat(initialPct.replace(",", "."));
    const incNum = parseFloat(increment.replace(",", "."));

    if (isNaN(initialNum) || isNaN(incNum)) {
      toast.error("Percentuais inválidos");
      return;
    }

    let autoThresholdNum: number | null = null;
    if (isAutoMode) {
      autoThresholdNum = parseFloat(autoT.replace(",", "."));
      if (isNaN(autoThresholdNum)) {
        toast.error("Threshold do modo automático inválido");
        return;
      }
    }

    startTransition(async () => {
      const r = await updateDeflatorTypeAction({
        id: deflator.id,
        displayName,
        initialPercent: initialNum,
        incrementPerOccurrence: incNum,
        autoFromKpiSlug: isAutoMode ? autoSlug.trim() : null,
        autoComparison: isAutoMode ? autoCmp : null,
        autoThreshold: autoThresholdNum,
      });
      if (r.success) toast.success("Salvo");
      else toast.error(r.error);
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <div className="flex items-baseline gap-2">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isPending}
          className="elevation-2 ds-body flex-1 rounded-md px-3 py-2 font-medium"
          style={{ border: "1px solid var(--border)" }}
        />
        <span
          className="ds-mono-sm"
          style={{
            color: isAutoMode ? "var(--primary)" : "var(--muted-foreground)",
          }}
        >
          {isAutoMode ? "automático" : "manual"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Desconto inicial (%)
          </label>
          <input
            type="text"
            value={initialPct}
            onChange={(e) => setInitialPct(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Acréscimo por ocorrência (%)
          </label>
          <input
            type="text"
            value={increment}
            onChange={(e) => setIncrement(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
      </div>

      <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p className="ds-mono-sm text-muted-foreground mb-2">
          Disparo automático (deixe o KPI em branco se for deflator manual)
        </p>
        <div className="grid grid-cols-4 gap-2">
          <input
            type="text"
            value={autoSlug}
            onChange={(e) => setAutoSlug(e.target.value)}
            disabled={isPending}
            placeholder="kpi_slug"
            className="elevation-2 ds-mono col-span-2 rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
          <select
            value={autoCmp}
            onChange={(e) => setAutoCmp(e.target.value as Comparison)}
            disabled={isPending || !isAutoMode}
            className="elevation-2 ds-mono rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)", colorScheme: "dark" }}
          >
            {COMPARISONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={autoT}
            onChange={(e) => setAutoT(e.target.value)}
            disabled={isPending || !isAutoMode}
            placeholder="threshold"
            className="elevation-2 ds-mono rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending && (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          )}
          Salvar
        </Button>
      </div>
    </div>
  );
}
