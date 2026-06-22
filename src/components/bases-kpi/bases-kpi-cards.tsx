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
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="ds-h2">Operadores</h2>
        </div>
        <SnapshotForm
          existingMonths={existingMonths}
          onDateChange={handleDateChange}
        />
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <div>
          <h2 className="ds-h2">Supervisores</h2>
          <p className="ds-small text-muted-foreground">
            A data de referência é herdada do card de operadores acima.
          </p>
        </div>
        <GestorSnapshotForm mesRef={sharedMesRef} dataCorte={sharedDataCorte} />
      </section>
    </div>
  );
}
