import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/users/types";

interface Props {
  role: UserRole;
}

export function RoleBadge({ role }: Props) {
  // Fundo sólido + texto branco no tema claro, com croma reduzido (~metade
  // da saturação do Tailwind bg-blue-700/bg-amber-700 puro). Mesmo nível de
  // restrição de croma já usado nos tokens semânticos do sistema
  // (--danger/--warning). Tema escuro intocado.
  const config: Record<UserRole, { className: string; label: string }> = {
    ADM: {
      label: "ADM",
      className:
        "bg-[oklch(0.42_0.10_260)] text-white border-[oklch(0.34_0.09_260)] dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30",
    },
    GESTOR: {
      label: "GESTOR",
      className:
        "bg-[oklch(0.48_0.10_75)] text-white border-[oklch(0.38_0.09_75)] dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/30",
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
