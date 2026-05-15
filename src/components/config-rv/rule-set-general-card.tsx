"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateRuleSetAction } from "@/lib/rv/actions/update-rule-set";
import type { RvRuleSet } from "@/lib/rv/types";

interface Props {
  ruleSet: RvRuleSet;
}

export function RuleSetGeneralCard({ ruleSet }: Props) {
  const [tetoBase, setTetoBase] = useState(String(ruleSet.tetoBase));
  const [maxPct, setMaxPct] = useState(String(ruleSet.multiplicadorMaxPct));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const tetoNum = parseFloat(tetoBase.replace(",", "."));
    const pctNum = parseFloat(maxPct.replace(",", "."));

    if (isNaN(tetoNum) || tetoNum < 0) {
      toast.error("Teto inválido");
      return;
    }
    if (isNaN(pctNum) || pctNum < 0) {
      toast.error("Multiplicador inválido");
      return;
    }

    startTransition(async () => {
      const r = await updateRuleSetAction({
        id: ruleSet.id,
        tetoBase: tetoNum,
        multiplicadorMaxPct: pctNum,
      });
      if (r.success) toast.success("Salvo");
      else toast.error(r.error);
    });
  }

  return (
    <div className="elevation-1 space-y-4 rounded-xl p-5">
      <h3 className="ds-h2" style={{ fontSize: "1.15rem" }}>
        Configurações gerais
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Teto base (R$)
          </label>
          <input
            type="text"
            value={tetoBase}
            onChange={(e) => setTetoBase(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>

        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Multiplicador máximo (%)
          </label>
          <input
            type="text"
            value={maxPct}
            onChange={(e) => setMaxPct(e.target.value)}
            disabled={isPending}
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
