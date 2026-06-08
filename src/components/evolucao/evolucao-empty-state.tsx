import { IconChartLine } from "@tabler/icons-react";

export function EvolucaoEmptyState() {
  return (
    <div
      className="elevation-1 flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-12"
      style={{ minHeight: "240px" }}
    >
      <IconChartLine
        size={32}
        className="text-muted-foreground"
        aria-hidden="true"
      />
      <div className="space-y-1 text-center">
        <p className="ds-body font-medium">Sem histórico de KPI ainda</p>
        <p className="ds-mono-sm text-muted-foreground">
          A evolução aparece conforme os meses são fechados.
        </p>
      </div>
    </div>
  );
}
