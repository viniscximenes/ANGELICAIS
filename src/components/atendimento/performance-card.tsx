import type { PerformanceOperador } from "@/lib/atendimento/types";

interface Props {
  performance: PerformanceOperador | null;
}

function getColorForTx(tx: number): string {
  if (tx < 60) return "var(--danger)";
  if (tx < 66) return "var(--warning)";
  return "var(--success)";
}

function formatTx(tx: number): string {
  return tx.toFixed(1).replace(".", ",");
}

interface MetricCardProps {
  label: string;
  hint: string;
  tx: number;
  retidos: number;
  cancelados: number;
  pedidos: number;
  emphasize?: boolean;
}

function MetricCard({
  label,
  hint,
  tx,
  retidos,
  cancelados,
  pedidos,
  emphasize,
}: MetricCardProps) {
  return (
    <div
      className="elevation-2 rounded-md p-3"
      style={{
        border: emphasize
          ? `1px solid color-mix(in oklch, ${getColorForTx(tx)} 40%, var(--border))`
          : "1px solid var(--border)",
        background: emphasize
          ? `color-mix(in oklch, ${getColorForTx(tx)} 4%, var(--background))`
          : undefined,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <span className="ds-mono text-muted-foreground text-[11px] uppercase tracking-wider">
            {label}
          </span>
          <span className="ds-mono-sm text-muted-foreground text-[11px]">
            {hint}
          </span>
        </div>
        <span
          className="ds-h2"
          style={{
            fontSize: "1.5rem",
            color: getColorForTx(tx),
          }}
        >
          {formatTx(tx)}%
        </span>
      </div>
      <div className="mt-2 flex gap-4">
        <span className="ds-mono-sm">
          <span className="text-muted-foreground">Retidos:</span> {retidos}
        </span>
        <span className="ds-mono-sm">
          <span className="text-muted-foreground">Cancelados:</span>{" "}
          {cancelados}
        </span>
        <span className="ds-mono-sm">
          <span className="text-muted-foreground">Pedidos:</span> {pedidos}
        </span>
      </div>
    </div>
  );
}

export function PerformanceCard({ performance }: Props) {
  if (!performance) {
    return (
      <div className="elevation-1 rounded-xl p-5">
        <h2 className="ds-h2 mb-2" style={{ fontSize: "1.125rem" }}>
          Performance
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Dados indisponíveis no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <div>
        <h2 className="ds-h2" style={{ fontSize: "1.125rem" }}>
          Performance
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Demonstrativo. KPI final pode variar conforme fechamento.
        </p>
      </div>

      <div className="space-y-3">
        <MetricCard
          label="KPI até ontem"
          hint="Oficial — mês corrente"
          tx={performance.kpiAteOntemTx}
          retidos={performance.kpiAteOntemRetidos}
          cancelados={performance.kpiAteOntemCancelados}
          pedidos={performance.kpiAteOntemPedidos}
        />

        <MetricCard
          label="Estimativa do dia"
          hint="KPI + D-1 hoje"
          tx={performance.estimativaTx}
          retidos={performance.estimativaRetidos}
          cancelados={performance.estimativaCancelados}
          pedidos={performance.estimativaPedidos}
          emphasize
        />
      </div>
    </div>
  );
}
