import type { UserRole } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

import type { SidebarSection } from "./sidebar";

const ALL_SECTIONS: SidebarSection[] = [
  {
    id: "d-1",
    label: "D-1",
    iconName: "chart",
    basePath: "/d-1",
    permission: "view_d1_personal",
    items: [
      { label: "Consolidado", href: "/d-1/consolidado" },
      { label: "Tempo Logado", href: "/d-1/tempo-logado" },
      { label: "Indisponibilidade", href: "/d-1/indisponibilidade" },
    ],
  },
  {
    id: "kpi",
    label: "KPI",
    iconName: "target",
    basePath: "/kpi",
    permission: "view_kpi",
    items: [{ label: "Mês Atual", href: "/kpi/atual-principal" }],
  },
  {
    id: "bases",
    label: "Bases",
    iconName: "database",
    basePath: "/bases",
    permission: "manage_base",
    items: [{ label: "KPI", href: "/bases/kpi" }],
  },
  {
    id: "config",
    label: "Configurações",
    iconName: "settings",
    basePath: "/config",
    permission: "manage_system",
    items: [{ label: "KPI", href: "/config/kpi" }],
  },
];

export function getSidebarSectionsForRole(role: UserRole): SidebarSection[] {
  return ALL_SECTIONS.filter((section) => can(role, section.permission));
}
