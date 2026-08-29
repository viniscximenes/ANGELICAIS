import type { UserRole } from "./get-current-user";

export type Permission =
  | "manage_base" // bases de KPI (/bases/kpi, snapshots) — ADM
  | "manage_d1_base" // base do D-1 (upload/clear consolidado e tempo logado)
  | "view_gestor_panel"
  | "manage_system";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ADM: acesso EXCLUSIVAMENTE administrativo — sem nenhuma permissão
  // operacional/de gestão (painel do gestor incluso). Só manage_base
  // (/bases) e manage_system (/configuracoes) — ambas já eram, na prática,
  // exclusivas do ADM. Reforçado por middleware (ver
  // src/lib/supabase/middleware.ts), que bloqueia qualquer rota fora de
  // /bases e /configuracoes mesmo se uma página esquecer de checar isso.
  ADM: ["manage_base", "manage_system"],
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
