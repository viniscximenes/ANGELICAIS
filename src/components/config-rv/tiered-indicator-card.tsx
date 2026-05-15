"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateTieredIndicatorAction } from "@/lib/rv/actions/update-tiered-indicator";
import type { Direction, Faixa, TieredIndicator } from "@/lib/rv/types";

interface Props {
  indicator: TieredIndicator;
}

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "higher_better", label: "maior é melhor" },
  { value: "lower_better", label: "menor é melhor" },
  { value: "closer_to_zero", label: "mais próximo de 0" },
];

export function TieredIndicatorCard({ indicator }: Props) {
  const [displayName, setDisplayName] = useState(indicator.displayName);
  const [kpiSlug, setKpiSlug] = useState(indicator.kpiSlug);
  const [direction, setDirection] = useState<Direction>(indicator.direction);
  const [faixas, setFaixas] = useState<Faixa[]>(indicator.faixas);
  const [requiresSlug, setRequiresSlug] = useState(
    indicator.requiresIndicatorSlug ?? "",
  );
  const [requiresThreshold, setRequiresThreshold] = useState(
    indicator.requiresThreshold !== null
      ? String(indicator.requiresThreshold)
      : "",
  );
  const [isPending, startTransition] = useTransition();

  function updateFaixa(idx: number, field: "threshold" | "value", val: string) {
    const num = parseFloat(val.replace(",", "."));
    if (isNaN(num)) return;
    const newFaixas = [...faixas];
    newFaixas[idx] = { ...newFaixas[idx], [field]: num };
    setFaixas(newFaixas);
  }

  function addFaixa() {
    setFaixas([...faixas, { threshold: 0, value: 0 }]);
  }

  function removeFaixa(idx: number) {
    setFaixas(faixas.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const reqT = requiresThreshold.trim();
    const reqTNum = reqT ? parseFloat(reqT.replace(",", ".")) : null;

    startTransition(async () => {
      const r = await updateTieredIndicatorAction({
        id: indicator.id,
        displayName,
        kpiSlug,
        direction,
        faixas,
        requiresIndicatorSlug: requiresSlug.trim() || null,
        requiresThreshold:
          reqTNum !== null && !isNaN(reqTNum) ? reqTNum : null,
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            KPI
          </label>
          <input
            type="text"
            value={kpiSlug}
            onChange={(e) => setKpiSlug(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Direção
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)", colorScheme: "dark" }}
          >
            {DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="ds-mono-sm text-muted-foreground mb-2">
          Faixas (ordem: maior valor pra menor)
        </p>
        <div className="space-y-2">
          {faixas.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="ds-mono-sm text-muted-foreground w-16">
                Limite:
              </span>
              <input
                type="text"
                value={String(f.threshold)}
                onChange={(e) => updateFaixa(idx, "threshold", e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-24 rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
              />
              <span className="ds-mono-sm text-muted-foreground">→ R$</span>
              <input
                type="text"
                value={String(f.value)}
                onChange={(e) => updateFaixa(idx, "value", e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-28 rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
              />
              <button
                type="button"
                onClick={() => removeFaixa(idx)}
                disabled={isPending}
                className="text-muted-foreground hover:text-danger p-1 transition-colors"
                aria-label="Remover faixa"
              >
                <IconTrash size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addFaixa}
            disabled={isPending}
            className="ds-mono-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <IconPlus size={14} aria-hidden="true" />
            Adicionar faixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Pré-requisito (slug)
          </label>
          <input
            type="text"
            value={requiresSlug}
            onChange={(e) => setRequiresSlug(e.target.value)}
            disabled={isPending}
            placeholder="ex: tx_retencao"
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Pré-requisito (≥ valor)
          </label>
          <input
            type="text"
            value={requiresThreshold}
            onChange={(e) => setRequiresThreshold(e.target.value)}
            disabled={isPending}
            placeholder="ex: 60"
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
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
