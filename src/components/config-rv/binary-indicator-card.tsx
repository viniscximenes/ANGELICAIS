"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateBinaryIndicatorAction } from "@/lib/rv/actions/update-binary-indicator";
import type { BinaryIndicator, Comparison } from "@/lib/rv/types";

interface Props {
  indicator: BinaryIndicator;
}

const COMPARISONS: { value: Comparison; label: string }[] = [
  { value: "gte", label: "≥" },
  { value: "gt", label: ">" },
  { value: "eq", label: "=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];

export function BinaryIndicatorCard({ indicator }: Props) {
  const [displayName, setDisplayName] = useState(indicator.displayName);
  const [kpiSlug, setKpiSlug] = useState(indicator.kpiSlug);
  const [comparison, setComparison] = useState<Comparison>(
    indicator.comparison,
  );
  const [threshold, setThreshold] = useState(String(indicator.threshold));
  const [valueIfAchieved, setValueIfAchieved] = useState(
    String(indicator.valueIfAchieved),
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const tNum = parseFloat(threshold.replace(",", "."));
    const vNum = parseFloat(valueIfAchieved.replace(",", "."));

    if (isNaN(tNum) || isNaN(vNum)) {
      toast.error("Valores numéricos inválidos");
      return;
    }

    startTransition(async () => {
      const r = await updateBinaryIndicatorAction({
        id: indicator.id,
        displayName,
        kpiSlug,
        comparison,
        threshold: tNum,
        valueIfAchieved: vNum,
      });
      if (r.success) toast.success("Salvo");
      else toast.error(r.error);
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={isPending}
        className="elevation-2 ds-body w-full rounded-md px-3 py-2 font-medium"
        style={{ border: "1px solid var(--border)" }}
      />

      <div className="grid grid-cols-4 gap-2">
        <input
          type="text"
          value={kpiSlug}
          onChange={(e) => setKpiSlug(e.target.value)}
          disabled={isPending}
          placeholder="kpi_slug"
          className="elevation-2 ds-mono col-span-2 rounded-md px-3 py-2"
          style={{ border: "1px solid var(--border)" }}
        />
        <select
          value={comparison}
          onChange={(e) => setComparison(e.target.value as Comparison)}
          disabled={isPending}
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
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          disabled={isPending}
          placeholder="valor"
          className="elevation-2 ds-mono rounded-md px-3 py-2"
          style={{ border: "1px solid var(--border)" }}
        />
      </div>

      <div>
        <label className="ds-mono-sm text-muted-foreground mb-1 block">
          Valor se atingido (R$)
        </label>
        <input
          type="text"
          value={valueIfAchieved}
          onChange={(e) => setValueIfAchieved(e.target.value)}
          disabled={isPending}
          className="elevation-2 ds-mono w-full max-w-xs rounded-md px-3 py-2"
          style={{ border: "1px solid var(--border)" }}
        />
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
