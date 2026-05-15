"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateMultiplierAction } from "@/lib/rv/actions/update-multiplier";
import type { Multiplier } from "@/lib/rv/types";

interface Props {
  multiplier: Multiplier;
}

export function MultiplierCard({ multiplier }: Props) {
  const [displayName, setDisplayName] = useState(multiplier.displayName);
  const [kpiSlug, setKpiSlug] = useState(multiplier.kpiSlug);
  const [forecastSlug, setForecastSlug] = useState(multiplier.forecastKpiSlug);
  const [cap, setCap] = useState(multiplier.capAt100Pct);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const r = await updateMultiplierAction({
        id: multiplier.id,
        displayName,
        kpiSlug,
        forecastKpiSlug: forecastSlug,
        capAt100Pct: cap,
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
            Forecast KPI
          </label>
          <input
            type="text"
            value={forecastSlug}
            onChange={(e) => setForecastSlug(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
      </div>

      <label className="ds-mono-sm text-muted-foreground flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={cap}
          onChange={(e) => setCap(e.target.checked)}
          disabled={isPending}
        />
        Trava em 100% (não ultrapassa o bruto)
      </label>

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
