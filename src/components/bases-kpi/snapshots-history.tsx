import {
  formatDateTimeBR,
  formatMonthLabel,
} from "@/lib/kpi/bases/format-date";
import type { MonthSummary } from "@/lib/kpi/bases/get-snapshots-summary";

interface SnapshotsHistoryProps {
  snapshots: MonthSummary[];
}

export function SnapshotsHistory({ snapshots }: SnapshotsHistoryProps) {
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
            {snapshots.map((s) => (
              <div
                key={s.mesRef}
                className="flex items-center justify-between gap-4 px-3 py-2"
              >
                <span className="ds-body font-medium">
                  {formatMonthLabel(s.mesRef)}
                </span>
                <span className="ds-mono-sm text-muted-foreground">
                  atualizado em {formatDateTimeBR(s.updatedAt)}
                </span>
                <span className="ds-mono-sm text-muted-foreground">
                  {s.totalOperators} op{s.totalOperators === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
