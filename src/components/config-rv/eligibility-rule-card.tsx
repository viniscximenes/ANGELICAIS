"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateEligibilityRuleAction } from "@/lib/rv/actions/update-eligibility-rule";
import type { Comparison, EligibilityRule } from "@/lib/rv/types";

interface Props {
  rule: EligibilityRule;
}

const COMPARISONS: { value: Comparison; label: string }[] = [
  { value: "gte", label: "≥" },
  { value: "gt", label: ">" },
  { value: "eq", label: "=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];

export function EligibilityRuleCard({ rule }: Props) {
  const [displayName, setDisplayName] = useState(rule.displayName);
  const [kpiSlug, setKpiSlug] = useState(rule.kpiSlug ?? "");
  const [comparison, setComparison] = useState<Comparison>(rule.comparison);
  const [threshold, setThreshold] = useState(String(rule.threshold));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const tNum = parseFloat(threshold.replace(",", "."));
    if (isNaN(tNum)) {
      toast.error("Valor inválido");
      return;
    }

    startTransition(async () => {
      const r = await updateEligibilityRuleAction({
        id: rule.id,
        displayName,
        kpiSlug: kpiSlug.trim() || null,
        comparison,
        threshold: tNum,
      });
      if (r.success) toast.success("Salvo");
      else toast.error(r.error);
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-lg p-4">
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={isPending}
        placeholder="Nome da regra"
        className="elevation-2 ds-body w-full rounded-md px-3 py-2 font-medium"
        style={{ border: "1px solid var(--border)" }}
      />

      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={kpiSlug}
          onChange={(e) => setKpiSlug(e.target.value)}
          disabled={isPending}
          placeholder="kpi_slug (opcional)"
          className="elevation-2 ds-mono col-span-1 rounded-md px-3 py-2"
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
