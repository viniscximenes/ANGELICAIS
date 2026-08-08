/**
 * ⚠️ LEGADO — NÃO IMPORTAR. Versão Google Sheets do CRUD de operadores do
 * gestor, morta desde a migração do D-1 para o Supabase. Nada no app importa
 * este arquivo.
 *
 * Renomeado para `_actions.legacy.ts` porque exportava
 * `listarOperadoresAction` / `adicionarOperadorAction` / `excluirOperadorAction`
 * com exatamente os mesmos nomes das ações vivas — o auto-import do editor
 * podia puxar estas por engano, sem erro de tipo, e gravar na planilha.
 *
 * As ações vivas estão em:
 *   - src/lib/gestor/equipe/actions.ts        (página unificada /configuracoes/equipe)
 *   - src/lib/d1-db/actions/operadores-gestor-actions.ts (fluxo antigo, ainda usado
 *     pelo componente operadores-d1-form.tsx mantido como referência)
 */
"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveGuiaGestor, resolveGuiaTempoLogado } from "../resolve-guia-gestor";
import { listarOperadoresD1, type OperadorD1 } from "./listar";
import { adicionarOperadorD1 } from "./adicionar";
import { excluirOperadorD1 } from "./excluir";

type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };
type VoidResult = { ok: true } | { ok: false; error: string };

async function resolverContexto() {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return null;

  const id = user.profile.username || user.profile.emailCorporativo;
  const guiaPrincipal = resolveGuiaGestor(id);
  const guia2 = resolveGuiaTempoLogado(id);
  if (!guiaPrincipal || !guia2) return null;

  return {
    guiaPrincipal,
    guia2,
    nomeSupervisor: user.profile.fullName,
  };
}

export async function listarOperadoresAction(): Promise<DataResult<OperadorD1[]>> {
  const ctx = await resolverContexto();
  if (!ctx) return { ok: false, error: "Não autorizado." };

  try {
    const data = await listarOperadoresD1(ctx.guiaPrincipal);
    return { ok: true, data };
  } catch (err) {
    console.error("[listarOperadoresAction]", err);
    return { ok: false, error: "Erro ao listar operadores." };
  }
}

export async function adicionarOperadorAction(
  email: string,
): Promise<DataResult<{ linha: number }>> {
  const ctx = await resolverContexto();
  if (!ctx) return { ok: false, error: "Não autorizado." };

  const result = await adicionarOperadorD1(
    ctx.guiaPrincipal,
    ctx.guia2,
    email,
    ctx.nomeSupervisor,
  );

  if (!result.ok) return result;
  return { ok: true, data: { linha: result.linha } };
}

export async function excluirOperadorAction(email: string): Promise<VoidResult> {
  const ctx = await resolverContexto();
  if (!ctx) return { ok: false, error: "Não autorizado." };

  return excluirOperadorD1(ctx.guiaPrincipal, ctx.guia2, email);
}
