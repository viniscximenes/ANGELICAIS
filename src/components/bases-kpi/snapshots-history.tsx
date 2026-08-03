"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteMonthAction } from "@/lib/kpi/bases/delete-month-action";
import {
  formatDateTimeBR,
  formatMonthLabel,
  getCurrentMonthRef,
} from "@/lib/kpi/bases/format-date";
import type { MonthSummary } from "@/lib/kpi/bases/get-snapshots-summary";

import { ClearCurrentMonthButton } from "./clear-current-month-button";

interface SnapshotsHistoryProps {
  snapshots: MonthSummary[];
}

export function SnapshotsHistory({ snapshots }: SnapshotsHistoryProps) {
  const router = useRouter();
  const currentMesRef = getCurrentMonthRef();
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(mesRef: string) {
    if (
      !confirm(
        `Tem certeza que deseja apagar todos os dados de ${formatMonthLabel(mesRef)}?\n\nEsta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setDeletingMonth(mesRef);

    startTransition(async () => {
      const result = await deleteMonthAction(mesRef);
      setDeletingMonth(null);

      if (result.success) {
        toast.success("Mês apagado", {
          description: `${result.rowsDeleted} registros removidos`,
        });
        router.refresh();
      } else {
        toast.error("Não foi possível apagar", { description: result.error });
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="space-y-3">
        <h2 className="ds-h2">Histórico</h2>

        {snapshots.length === 0 ? (
          <div className="elevation-1 rounded-xl p-8 text-center">
            <p className="ds-body text-muted-foreground">
              Nenhum dado de KPI salvo ainda
            </p>
            <p className="ds-mono-sm text-muted-foreground mt-1">
              Cole sua primeira base acima.
            </p>
          </div>
        ) : (
          <div className="elevation-1 space-y-1 rounded-xl p-3">
            {snapshots.map((s) => {
              const isCurrent = s.mesRef === currentMesRef;
              const isDeleting = deletingMonth === s.mesRef;

              return (
                <div
                  key={s.mesRef}
                  className="flex items-center justify-between gap-4 px-3 py-2"
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="ds-body font-medium">
                      {formatMonthLabel(s.mesRef)}
                    </span>
                    {isCurrent && (
                      <span
                        className="ds-mono-sm"
                        style={{ color: "var(--primary)" }}
                      >
                        (atual)
                      </span>
                    )}
                  </div>

                  <span className="ds-mono-sm text-muted-foreground hidden flex-1 text-right sm:block">
                    atualizado em {formatDateTimeBR(s.updatedAt)}
                  </span>

                  <span className="ds-mono-sm text-muted-foreground">
                    {s.totalOperators} op{s.totalOperators === 1 ? "" : "s"}
                  </span>

                  {isCurrent ? (
                    <ClearCurrentMonthButton />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(s.mesRef)}
                      disabled={isPending}
                      className="ds-mono-sm flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
                      style={{
                        color: "var(--muted-foreground)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--danger)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--muted-foreground)";
                      }}
                      aria-label={`Apagar ${formatMonthLabel(s.mesRef)}`}
                    >
                      {isDeleting ? (
                        <IconLoader2
                          size={14}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <IconTrash size={14} aria-hidden="true" />
                      )}
                      <span>Apagar</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
