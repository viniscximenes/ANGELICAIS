"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addDeflatorOccurrenceAction } from "@/lib/rv/actions/add-deflator-occurrence";
import type { OperatorListItem } from "@/lib/rv/get-all-operators-with-emails";
import type { DeflatorType } from "@/lib/rv/types";

interface Props {
  operators: OperatorListItem[];
  manualDeflators: DeflatorType[];
  mesRef: string;
}

export function ApplyDeflatorForm({
  operators,
  manualDeflators,
  mesRef,
}: Props) {
  const [operatorEmail, setOperatorEmail] = useState("");
  const [deflatorTypeId, setDeflatorTypeId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!operatorEmail) {
      toast.error("Selecione um operador");
      return;
    }
    if (!deflatorTypeId) {
      toast.error("Selecione um deflator");
      return;
    }

    startTransition(async () => {
      const r = await addDeflatorOccurrenceAction({
        operatorEmail,
        deflatorTypeId,
        mesRef,
      });

      if (r.success) {
        toast.success("Ocorrência adicionada");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <h3 className="ds-h2" style={{ fontSize: "1.05rem" }}>
        Adicionar ocorrência
      </h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Operador
          </label>
          <select
            value={operatorEmail}
            onChange={(e) => setOperatorEmail(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)", colorScheme: "dark" }}
          >
            <option value="">Selecionar operador…</option>
            {operators.map((op) => (
              <option key={op.id} value={op.emailCorporativo}>
                {op.fullName} ({op.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Tipo de deflator
          </label>
          <select
            value={deflatorTypeId}
            onChange={(e) => setDeflatorTypeId(e.target.value)}
            disabled={isPending}
            className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)", colorScheme: "dark" }}
          >
            <option value="">Selecionar deflator…</option>
            {manualDeflators.map((d) => (
              <option key={d.id} value={d.id}>
                {d.displayName} (-{d.initialPercent}%
                {d.incrementPerOccurrence > 0 &&
                  ` +${d.incrementPerOccurrence}% por ocorrência`}
                )
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !operatorEmail || !deflatorTypeId}
          className="gap-2"
        >
          {isPending ? (
            <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <IconPlus size={16} aria-hidden="true" />
          )}
          {isPending ? "Adicionando..." : "Adicionar ocorrência"}
        </Button>
      </div>
    </div>
  );
}
