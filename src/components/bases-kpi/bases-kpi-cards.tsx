"use client";

import { useCallback, useState } from "react";

import { getCurrentMonthRef, getYesterday } from "@/lib/kpi/bases/format-date";

import { GestorSnapshotForm } from "./gestor-snapshot-form";
import { SnapshotForm } from "./snapshot-form";

interface BasesKpiCardsProps {
  existingMonths: string[];
}

export function BasesKpiCards({ existingMonths }: BasesKpiCardsProps) {
  const [sharedMesRef, setSharedMesRef] = useState(getCurrentMonthRef);
  const [sharedDataCorte, setSharedDataCorte] = useState(getYesterday);

  const handleDateChange = useCallback(
    (mesRef: string, dataCorte: string) => {
      setSharedMesRef(mesRef);
      setSharedDataCorte(dataCorte);
    },
    [],
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            Operadores
          </span>
          <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
        </div>
        <SnapshotForm
          existingMonths={existingMonths}
          onDateChange={handleDateChange}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
              Gestores
            </span>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              A data de referência é herdada do card de operadores acima.
            </p>
          </div>
          <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
        </div>
        <GestorSnapshotForm mesRef={sharedMesRef} dataCorte={sharedDataCorte} />
      </section>
    </div>
  );
}
