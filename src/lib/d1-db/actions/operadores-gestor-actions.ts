"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";
import type { OperadorD1 } from "../types";

// Aceita nome.sobrenome@alloha.com (com pelo menos um ponto no local-part) —
// mesma regra do fluxo antigo (Sheets).
const EMAIL_REGEX = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9][a-z0-9._-]*@alloha\.com$/i;

type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };
type VoidResult = { ok: true } | { ok: false; error: string };

async function gestorLogado() {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return null;
  return user;
}

export async function listarOperadoresAction(): Promise<DataResult<OperadorD1[]>> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("d1_operadores_gestor")
    .select("operador_email")
    .eq("gestor_id", user.profile.id)
    .order("operador_email", { ascending: true });

  if (error) {
    console.error("[listarOperadoresAction]", error.message);
    return { ok: false, error: "Erro ao listar operadores." };
  }

  return { ok: true, data: (data ?? []).map((row) => ({ email: row.operador_email })) };
}

export async function adicionarOperadorAction(email: string): Promise<VoidResult> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const emailNorm = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(emailNorm)) {
    return { ok: false, error: "Email inválido. Use o formato nome.sobrenome@alloha.com" };
  }

  const admin = createAdminClient();

  // Um operador só pode estar em UMA equipe — checa as duas variantes de
  // domínio pra não duplicar a mesma pessoa sob um email legado.
  const { data: existente, error: checkErr } = await admin
    .from("d1_operadores_gestor")
    .select("gestor_id")
    .in("operador_email", getEmailVariants(emailNorm))
    .maybeSingle();

  if (checkErr) {
    console.error("[adicionarOperadorAction] erro ao verificar duplicata:", checkErr.message);
    return { ok: false, error: "Erro ao verificar operador. Tente novamente." };
  }

  if (existente) {
    return {
      ok: false,
      error:
        existente.gestor_id === user.profile.id
          ? "Operador já está na equipe."
          : "Operador já está em outra equipe.",
    };
  }

  const { error } = await admin
    .from("d1_operadores_gestor")
    .insert({ gestor_id: user.profile.id, operador_email: emailNorm });

  if (error) {
    console.error("[adicionarOperadorAction] erro ao inserir:", error.message);
    return { ok: false, error: "Erro ao salvar. Tente novamente." };
  }

  return { ok: true };
}

export async function excluirOperadorAction(email: string): Promise<VoidResult> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const emailNorm = email.trim().toLowerCase();
  const admin = createAdminClient();

  const { error } = await admin
    .from("d1_operadores_gestor")
    .delete()
    .eq("gestor_id", user.profile.id)
    .eq("operador_email", emailNorm);

  if (error) {
    console.error("[excluirOperadorAction] erro ao excluir:", error.message);
    return { ok: false, error: "Erro ao remover. Tente novamente." };
  }

  return { ok: true };
}
