import type { UserRole } from "./get-current-user";

export type Permission =
  | "view_d1_personal"
  | "view_d1_team"
  | "manage_base"
  | "view_gestor_panel"
  | "manage_users"
  | "manage_system";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OP: ["view_d1_personal"],
  AUX: ["view_d1_personal", "view_d1_team", "manage_base"],
  ADM: [
    "view_d1_personal",
    "view_d1_team",
    "manage_base",
    "view_gestor_panel",
    "manage_users",
    "manage_system",
  ],
  GESTOR: ["view_gestor_panel"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
