// Leitura só de servidor (páginas e outras actions) — NÃO é Server Action:
// sem "use server", não vira endpoint chamável do navegador com um
// `rosterEmails` escolhido pelo cliente. server-only quebra o build se
// algum componente client importar este módulo.
import "server-only";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";

import type { PausaProgramadaDb } from "../types";

/**
 * Lê a base de pausas programadas (base_pausas_programadas), ordenada por
 * e-mail do operador. Retorna [] sem permissão. Erro de banco LANÇA — mesmo
 * par de get-roster-gestor.ts (getRosterOperadoresGestorOuErro): o painel
 * do gestor trata a falha como erro da página, em vez de mostrar "Sem
 * horários programados". Quem chama (a página) já fez o próprio gate de
 * acesso.
 *
 * @param rosterEmails Quando informado, filtra só os operadores desse roster
 * (expandindo por variantes de domínio, mesmo padrão de get-gestor-*.ts) —
 * usado pelo painel do gestor (Tempo Logado & Indisponibilidade), que só
 * precisa da própria equipe. Roster vazio → []. Omitido, busca a base
 * inteira — só para quem tem manage_system (tela administrativa
 * /s/bases/pausas, que precisa ver/editar todo mundo).
 */
export async function getPausasProgramadasOuErro(
  rosterEmails?: string[],
  /**
   * Usuário já autenticado por quem chama (refreshTempoIndispAction): o
   * cache() de getCurrentUser não deduplica dentro de Server Action, e sem
   * isto a action autenticaria duas vezes. Módulo server-only — não chega
   * do navegador. Omitido, autentica aqui.
   */
  usuario?: Awaited<ReturnType<typeof getCurrentUser>>,
): Promise<PausaProgramadaDb[]> {
  const user = usuario === undefined ? await getCurrentUser() : usuario;
  if (!user) return [];

  const podeVerBaseInteira = can(user.profile.role, "manage_system", user.profile.isAdminSkill);

  if (!podeVerBaseInteira && !can(user.profile.role, "view_gestor_panel")) {
    return [];
  }

  // Gestor só lê a própria equipe: sem roster, nada (antes, roster vazio ou
  // omitido devolvia a base inteira).
  if (rosterEmails === undefined ? !podeVerBaseInteira : rosterEmails.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  let query = admin
    .from("base_pausas_programadas")
    .select(
      "id, operator_email, celula, hora_login, hora_logout, descanso_1, pausa_20, descanso_2, updated_at",
    )
    .order("operator_email", { ascending: true });

  if (rosterEmails !== undefined) {
    query = query.in("operator_email", rosterEmails.flatMap(getEmailVariants));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[get-pausas-programadas] erro:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    operatorEmail: row.operator_email,
    celula: row.celula ?? "",
    horaLogin: row.hora_login,
    horaLogout: row.hora_logout,
    descanso1: row.descanso_1 ?? "",
    pausa20: row.pausa_20 ?? "",
    descanso2: row.descanso_2 ?? "",
    updatedAt: row.updated_at,
  }));
}

/**
 * Mesma leitura, mas erro de banco vira [] — contrato de sempre da tela
 * administrativa (/s/bases/pausas), que não mudou.
 */
export async function getPausasProgramadas(
  rosterEmails?: string[],
): Promise<PausaProgramadaDb[]> {
  try {
    return await getPausasProgramadasOuErro(rosterEmails);
  } catch {
    return [];
  }
}
