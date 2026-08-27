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
  // ADM: acesso EXCLUSIVAMENTE administrativo — sem nenhuma permissão
  // operacional/de gestão (D-1 pessoal, KPI, RV, Evolução, painel do gestor,
  // monitoria). Só manage_base (/bases) e manage_system (/config) — ambas já
  // eram, na prática, exclusivas do ADM. Reforçado por middleware (ver
  // src/lib/supabase/middleware.ts), que bloqueia qualquer rota fora de
  // /config e /bases mesmo se uma página individual esquecer de checar isso.
  ADM: ["manage_base", "manage_users", "manage_system"],
  // GESTOR: vê o painel da própria equipe e sobe a base do D-1.
  GESTOR: ["view_gestor_panel", "manage_d1_base"],
};

/**
 * @param isAdminSkill Flag aditiva (profiles.is_admin_skill): um GESTOR com
 * essa flag acumula, além das próprias permissões, as do ADM exclusivo —
 * sem perder nada do que já tinha como GESTOR. Irrelevante pra qualquer
 * role que não seja GESTOR (em especial, não afeta o ADM puro).
 */
export function can(
  role: UserRole,
  permission: Permission,
  isAdminSkill = false,
): boolean {
  if (ROLE_PERMISSIONS[role]?.includes(permission)) return true;
  if (role === "GESTOR" && isAdminSkill) {
    return ROLE_PERMISSIONS.ADM.includes(permission);
  }
  return false;
}
