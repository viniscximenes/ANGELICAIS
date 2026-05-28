"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateCombinedBonusAction } from "@/lib/rv/actions/update-combined-bonus";
import type {
  BonusCondition,
  CombinedBonus,
  Comparison,
} from "@/lib/rv/types";

interface Props {
  bonus: CombinedBonus;
}

const COMPARISONS: { value: Comparison; label: string }[] = [
  { value: "gte", label: "≥" },
  { value: "gt", label: ">" },
  { value: "eq", label: "=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];

export function CombinedBonusCard({ bonus }: Props) {
  const [displayName, setDisplayName] = useState(bonus.displayName);
  const [conditions, setConditions] = useState<BonusCondition[]>(
    bonus.conditions,
  );
  const [valueIfAll, setValueIfAll] = useState(String(bonus.valueIfAllAchieved));
  const [isPending, startTransition] = useTransition();

  function updateCondition(
    idx: number,
    field: keyof BonusCondition,
    val: string,
  ) {
    const newConditions = [...conditions];
    if (field === "threshold") {
      const num = parseFloat(val.replace(",", "."));
      if (isNaN(num)) return;
      newConditions[idx] = { ...newConditions[idx], threshold: num };
    } else if (field === "thresholdKpiSlug") {
      newConditions[idx] = {
        ...newConditions[idx],
        thresholdKpiSlug: val || null,
      };
    } else {
      newConditions[idx] = {
        ...newConditions[idx],
        [field]: val,
      } as BonusCondition;
    }
    setConditions(newConditions);
  }

  function addCondition() {
    setConditions([
      ...conditions,
      {
        kpiSlug: "",
        comparison: "gte",
        threshold: 0,
        thresholdKpiSlug: null,
      },
    ]);
  }

  function removeCondition(idx: number) {
    setConditions(conditions.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const vNum = parseFloat(valueIfAll.replace(",", "."));
    if (isNaN(vNum)) {
      toast.error("Valor inválido");
      return;
    }

    startTransition(async () => {
      const r = await updateCombinedBonusAction({
        id: bonus.id,
        displayName,
        conditions,
        valueIfAllAchieved: vNum,
      });
      if (r.success) toast.success("Salvo");
      else toast.error(r.error);
    });
  }

  return (
    <div className="elevation-1 space-y-4 rounded-xl p-5">
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={isPending}
        className="elevation-2 ds-h2 w-full rounded-md px-3 py-2"
        style={{ border: "1px solid var(--border)", fontSize: "1.15rem" }}
      />

      <div>
        <p className="ds-mono-sm text-muted-foreground mb-2">
          Condições (todas precisam ser atingidas)
        </p>
        <div className="space-y-2">
          {conditions.map((c, idx) => {
            const usaKpiDinamico = Boolean(c.thresholdKpiSlug);
            return (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={c.kpiSlug}
                  onChange={(e) =>
                    updateCondition(idx, "kpiSlug", e.target.value)
                  }
                  disabled={isPending}
                  placeholder="kpi_slug"
                  className="elevation-2 ds-mono flex-1 rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                />
                <select
                  value={c.comparison}
                  onChange={(e) =>
                    updateCondition(idx, "comparison", e.target.value)
                  }
                  disabled={isPending}
                  className="elevation-2 ds-mono w-20 rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    colorScheme: "dark",
                  }}
                >
                  {COMPARISONS.map((cmp) => (
                    <option key={cmp.value} value={cmp.value}>
                      {cmp.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={String(c.threshold)}
                  onChange={(e) =>
                    updateCondition(idx, "threshold", e.target.value)
                  }
                  disabled={isPending || usaKpiDinamico}
                  title={
                    usaKpiDinamico
                      ? "Threshold vem do KPI selecionado ao lado"
                      : undefined
                  }
                  className="elevation-2 ds-mono w-24 rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    opacity: usaKpiDinamico ? 0.4 : 1,
                  }}
                />
                <select
                  value={c.thresholdKpiSlug ?? ""}
                  onChange={(e) =>
                    updateCondition(idx, "thresholdKpiSlug", e.target.value)
                  }
                  disabled={isPending}
                  title="Comparar com KPI dinâmico (opcional)"
                  className="elevation-2 ds-mono w-44 rounded-md px-2 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    colorScheme: "dark",
                  }}
                >
                  <option value="">(valor fixo)</option>
                  <option value="forecast_churn">forecast_churn</option>
                  <option value="forecast_pedidos">forecast_pedidos</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeCondition(idx)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-danger p-1 transition-colors"
                  aria-label="Remover condição"
                >
                  <IconTrash size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addCondition}
            disabled={isPending}
            className="ds-mono-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <IconPlus size={14} aria-hidden="true" />
            Adicionar condição
          </button>
        </div>
      </div>

      <div>
        <label className="ds-mono-sm text-muted-foreground mb-1 block">
          Valor se todas atingidas (R$)
        </label>
        <input
          type="text"
          value={valueIfAll}
          onChange={(e) => setValueIfAll(e.target.value)}
          disabled={isPending}
          className="elevation-2 ds-mono w-full max-w-xs rounded-md px-3 py-2"
          style={{ border: "1px solid var(--border)" }}
        />
      </div>

      <div className="flex justify-end">
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
