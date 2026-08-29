import type { UserRole } from "./get-current-user";
import { can } from "./permissions";

/**
 * Decide a rota pós-login (e a landing da raiz "/") com base nas permissões
 * da role — não hardcoda roles específicas, então funciona para qualquer role
 * futuro. Centralizado aqui para que login-action, a página raiz e a página de
 * login compartilhem exatamente a mesma lógica.
 * - é ADM puro    → /bases/kpi (role ADM é exclusivamente administrativa;
 *                   a landing dela é a primeira tela do Painel Adm, não mais
 *                   /configuracoes/usuarios)
 * - tem gestor    → /reports/consolidado (GESTOR, com ou sem skill de admin —
 *                   a landing do multi-role continua sendo a de gestor)
 * - fallback      → /reports/consolidado
 */
export function getPostLoginPath(role: UserRole): string {
  if (can(role, "manage_system")) return "/bases/kpi";
  if (can(role, "view_gestor_panel")) return "/reports/consolidado";
  return "/reports/consolidado";
}
