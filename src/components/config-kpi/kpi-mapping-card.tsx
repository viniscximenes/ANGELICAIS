"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { KpiDefinition } from "@/lib/kpi/types";
import { updateKpiDefinitionAction } from "@/lib/kpi/update-definition-action";

interface KpiMappingCardProps {
  kpi: KpiDefinition;
}

export function KpiMappingCard({ kpi }: KpiMappingCardProps) {
  const [expectedHeader, setExpectedHeader] = useState(kpi.expectedHeader);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = expectedHeader.trim();
    if (!trimmed) {
      toast.error("Cabeçalho esperado não pode ser vazio");
      return;
    }

    startTransition(async () => {
      const result = await updateKpiDefinitionAction({
        id: kpi.id,
        thresholdRed: kpi.thresholdRed,
        thresholdYellow: kpi.thresholdYellow,
        thresholdGreen: kpi.thresholdGreen,
        thresholdDiffPercent: kpi.thresholdDiffPercent,
        expectedHeader: trimmed,
      });

      if (result.success) {
        toast.success("Mapeamento salvo");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <h3 className="ds-body font-semibold">{kpi.displayName}</h3>

      <div>
        <label className="ds-mono-sm text-muted-foreground mb-1 block">
          Cabeçalho esperado na planilha
        </label>
        <textarea
          value={expectedHeader}
          onChange={(e) => setExpectedHeader(e.target.value)}
          disabled={isPending}
          rows={2}
          className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
          style={{ border: "1px solid var(--border)", resize: "vertical" }}
          placeholder="Cole o cabeçalho exatamente como aparece na planilha"
        />
        <p className="ds-mono-sm text-muted-foreground mt-1">
          Preserve quebras de linha se houver. O sistema normaliza
          automaticamente ao comparar.
        </p>
      </div>

      <div className="flex justify-end">
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
    </div>
  );
}
