import type { UserRole } from "@/lib/users/types";

interface Props {
  role: UserRole;
}

export function RoleBadge({ role }: Props) {
  const config: Record<UserRole, { color: string; label: string }> = {
    ADM: { color: "var(--primary)", label: "ADM" },
    AUX: { color: "var(--success)", label: "AUX" },
    OP: { color: "var(--muted-foreground)", label: "OP" },
    GESTOR: { color: "var(--warning)", label: "GESTOR" },
    RELATORIO: { color: "var(--primary)", label: "RELATÓRIO" },
  };

  const { color, label } = config[role];

  return (
    <span
      className="ds-mono-sm inline-flex items-center rounded-full px-2 py-0.5"
      style={{
        background: `color-mix(in oklch, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
        fontSize: "11px",
      }}
    >
      {label}
    </span>
  );
}
