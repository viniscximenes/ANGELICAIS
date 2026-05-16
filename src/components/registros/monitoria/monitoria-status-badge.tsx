import type { MonitoriaStatus } from "@/lib/monitorias/types";

interface Props {
  status: MonitoriaStatus;
}

export function MonitoriaStatusBadge({ status }: Props) {
  const config = {
    pending: {
      label: "Pendente",
      bg: "color-mix(in oklch, var(--warning) 15%, transparent)",
      color: "var(--warning)",
      border: "color-mix(in oklch, var(--warning) 35%, transparent)",
    },
    finalized: {
      label: "Finalizada",
      bg: "color-mix(in oklch, var(--success) 15%, transparent)",
      color: "var(--success)",
      border: "color-mix(in oklch, var(--success) 35%, transparent)",
    },
    sent: {
      label: "Enviado ao Forms",
      bg: "color-mix(in oklch, var(--primary) 15%, transparent)",
      color: "var(--primary)",
      border: "color-mix(in oklch, var(--primary) 35%, transparent)",
    },
  }[status];

  return (
    <span
      className="ds-mono-sm inline-flex items-center rounded-full px-2 py-0.5"
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: "11px",
      }}
    >
      {config.label}
    </span>
  );
}
