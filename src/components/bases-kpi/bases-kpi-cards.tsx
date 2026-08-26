"use client";

import { useEffect, useState } from "react";
import { IconUser, IconUsersGroup } from "@tabler/icons-react";

import {
  getCurrentMonthRef,
  getLastDayOfMonth,
  getYesterday,
  toMonthRef,
} from "@/lib/kpi/bases/format-date";
import { cn } from "@/lib/utils";
import type { MonthSummary } from "@/lib/kpi/bases/get-snapshots-summary";

import { GestorSnapshotForm } from "./gestor-snapshot-form";
import { SnapshotForm } from "./snapshot-form";
import { SnapshotsHistory } from "./snapshots-history";

interface BasesKpiCardsProps {
  existingMonths: string[];
  snapshots: MonthSummary[];
  gestorSnapshots: MonthSummary[];
}

export function BasesKpiCards({
  existingMonths,
  snapshots,
  gestorSnapshots,
}: BasesKpiCardsProps) {
  const [activeTab, setActiveTab] = useState<"operadores" | "gestores">("operadores");

  const currentMesRef = getCurrentMonthRef();
  const [selectedOption, setSelectedOption] = useState<string>(currentMesRef);
  const [customMonth, setCustomMonth] = useState<string>("");
  const [dataCorte, setDataCorte] = useState(getYesterday());

  const effectiveMesRef =
    selectedOption === "__other__"
      ? customMonth
        ? toMonthRef(customMonth)
        : ""
      : selectedOption;

  const isCurrentMonth = effectiveMesRef === currentMesRef;
  const isPastMonth = !!(effectiveMesRef && effectiveMesRef !== currentMesRef);

  useEffect(() => {
    if (!effectiveMesRef) return;
    if (isCurrentMonth) {
      setDataCorte(getYesterday());
    } else {
      setDataCorte(getLastDayOfMonth(effectiveMesRef));
    }
  }, [effectiveMesRef, isCurrentMonth]);

  const dateProps = {
    existingMonths,
    selectedOption,
    setSelectedOption,
    customMonth,
    setCustomMonth,
    dataCorte,
    setDataCorte,
    effectiveMesRef,
    isCurrentMonth,
    isPastMonth,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("operadores")}
          aria-pressed={activeTab === "operadores"}
          className={cn(
            "ds-mono-sm flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none",
            activeTab === "operadores"
              ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
              : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
          )}
          style={{ fontSize: "12px" }}
        >
          <IconUser size={14} aria-hidden="true" />
          <span>Operadores</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gestores")}
          aria-pressed={activeTab === "gestores"}
          className={cn(
            "ds-mono-sm flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none",
            activeTab === "gestores"
              ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
              : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
          )}
          style={{ fontSize: "12px" }}
        >
          <IconUsersGroup size={14} aria-hidden="true" />
          <span>Gestores</span>
        </button>
      </div>

      <section>
        {activeTab === "operadores" ? (
          <SnapshotForm {...dateProps} />
        ) : (
          <GestorSnapshotForm {...dateProps} />
        )}
      </section>

      <SnapshotsHistory
        snapshots={activeTab === "operadores" ? snapshots : gestorSnapshots}
        type={activeTab}
      />
    </div>
  );
}
