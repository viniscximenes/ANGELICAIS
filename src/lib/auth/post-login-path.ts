import type { UserRole } from "./get-current-user";
import { can } from "./permissions";

/**
 * Decide a rota pós-login (e a landing da raiz "/") com base nas permissões
 * da role — não hardcoda roles específicas, então funciona para qualquer role
 * futuro. Centralizado aqui para que login-action, a página raiz e a página de
 * login compartilhem exatamente a mesma lógica.
 * - tem KPI       → /kpi/atual-principal (ADM/AUX/OP)
 * - tem D-1       → /d-1/consolidado (quem só tem D-1)
 * - tem gestor    → /gestor/d-1 (GESTOR)
 * - fallback      → /d-1/consolidado
 */
export function getPostLoginPath(role: UserRole): string {
  if (can(role, "view_kpi")) return "/kpi/atual-principal";
  if (can(role, "view_d1_personal") || can(role, "view_d1_team")) {
    return "/d-1/consolidado";
  }
  if (can(role, "view_gestor_panel")) return "/reports/consolidado";
  return "/d-1/consolidado";
}
