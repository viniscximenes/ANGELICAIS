import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/users/types";

interface Props {
  role: UserRole;
}

export function RoleBadge({ role }: Props) {
  // Cores da paleta global: ADM no tom primário (grafite/linho), GESTOR no
  // --warning (âmbar terroso). Claro = fundo sólido; escuro = translúcido.
  const config: Record<UserRole, { className: string; label: string }> = {
    ADM: {
      label: "ADM",
      className:
        "bg-primary text-primary-foreground border-primary dark:bg-primary/10 dark:text-primary dark:border-primary/25",
    },
    GESTOR: {
      label: "GESTOR",
      className:
        "bg-[var(--warning)] text-white border-[var(--warning)] dark:bg-[var(--warning-bg)] dark:text-[var(--warning)] dark:border-[var(--warning-border)]",
    },
    COORDENADOR: {
      label: "COORDENADOR",
      className:
        "bg-[var(--success)] text-white border-[var(--success)] dark:bg-[var(--success-bg)] dark:text-[var(--success)] dark:border-[var(--success-border)]",
    },
  };

  const { className, label } = config[role];

  return (
    <span
      className={cn(
        "ds-mono-sm inline-flex items-center rounded border px-2 py-0.5 font-medium select-none",
        className,
      )}
      style={{ fontSize: "11px" }}
    >
      {label}
    </span>
  );
}
