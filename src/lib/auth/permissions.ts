import type { UserRole } from "./get-current-user";

export type Permission =
  | "view_d1_personal"
  | "view_d1_team"
  | "view_kpi"
  | "view_monitoria"
  | "manage_base" // bases de KPI (/bases/kpi, snapshots) — ADM
  | "manage_d1_base" // base do D-1 (upload/clear consolidado e tempo logado)
  | "view_gestor_panel"
  | "manage_users"
  | "manage_system";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OP: ["view_d1_personal", "view_kpi"],
  AUX: ["view_d1_personal", "view_kpi", "view_monitoria"],
  // ADM: MANTÉM view_d1_personal (D-1 pessoal) e manage_base (bases de KPID — distinta da base do D-1).
  ADM: [
    "view_d1_personal",
    "view_kpi",
    "view_monitoria",
    "manage_base",
    "view_gestor_panel",
    "manage_users",
    "manage_system",
  ],
  // GESTOR: vê o painel da própria equipe e sobe a base do D-1.
  GESTOR: ["view_gestor_panel", "manage_d1_base"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
