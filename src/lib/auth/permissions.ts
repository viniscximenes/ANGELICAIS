import type { UserRole } from "./get-current-user";

export type Permission =
  | "view_d1_personal"
  | "view_d1_team"
  | "view_kpi"
  | "view_monitoria"
  | "manage_base" // bases de KPI (/bases/kpi, snapshots) — ADM
  | "manage_d1_base" // base do D-1 (upload/clear consolidado e tempo logado) — RELATORIO
  | "view_gestor_panel"
  | "manage_users"
  | "manage_system";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OP: ["view_d1_personal", "view_kpi"],
  AUX: ["view_d1_personal", "view_kpi", "view_monitoria"],
  // ADM: as funções de base/exportação do D-1 migraram para o RELATORIO.
  // Removido view_d1_team (tabela/seletor/export da equipe) e a base do D-1
  // (manage_d1_base, que o ADM nunca recebe). MANTÉM view_d1_personal (D-1
  // pessoal) e manage_base (bases de KPID — distinta da base do D-1).
  ADM: [
    "view_d1_personal",
    "view_kpi",
    "view_monitoria",
    "manage_base",
    "view_gestor_panel",
    "manage_users",
    "manage_system",
  ],
  // GESTOR: vê o painel da própria equipe e sobe a base do D-1 (BASE - 1, a
  // mesma do RELATORIO). O export (copiar imagem) já vem da tabela do painel.
  GESTOR: ["view_gestor_panel", "manage_d1_base"],
  // RELATORIO: perfil dedicado ao relatório do D-1 (empresa toda).
  // Vê a seção D-1, a tabela de equipe + seletor de supervisor + exportação,
  // e faz upload da base do D-1. Sem KPI/RV/Evolução/Bases(KPI)/config.
  RELATORIO: ["view_d1_personal", "view_d1_team", "manage_d1_base"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
