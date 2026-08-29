import type { UserRole } from "./get-current-user";
import { can } from "./permissions";

/**
 * Decide a rota pós-login (e a landing da raiz "/") com base nas permissões
 * da role — não hardcoda roles específicas, então funciona para qualquer role
 * futuro. Centralizado aqui para que login-action, a página raiz e a página de
 * login compartilhem exatamente a mesma lógica.
 * - é ADM         → /configuracoes/usuarios (ADM é exclusivamente administrativo)
 * - tem gestor    → /reports/consolidado (GESTOR)
 * - fallback      → /reports/consolidado
 */
export function getPostLoginPath(role: UserRole): string {
  if (can(role, "manage_system")) return "/configuracoes/usuarios";
  if (can(role, "view_gestor_panel")) return "/reports/consolidado";
  return "/reports/consolidado";
}
