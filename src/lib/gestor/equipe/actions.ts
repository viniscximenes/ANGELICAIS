"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";

/**
 * Ações da página /configuracoes/equipe, sobre d1_operadores_gestor.
 *
 * O gestorId vem sempre de getCurrentUser().profile.id — uma query só. E a
 * remoção apaga o apelido junto, o que impede o acúmulo de registros órfãos
 * em operador_nome_fantasia.
 */

// Aceita nome.sobrenome@alloha.com (pelo menos um ponto no local-part).
const EMAIL_REGEX = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9][a-z0-9._-]*@alloha\.com$/i;

export type OperadorEquipe = {
  email: string;
  /** "" quando o operador ainda não tem apelido definido. */
  apelido: string;
};

type EquipeData = {
  ativo: boolean;
  operadores: OperadorEquipe[];
};

type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };
type VoidResult = { ok: true } | { ok: false; error: string };

async function gestorLogado() {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") return null;
  return user;
}

/**
 * Roster da equipe + apelido de cada um + estado do toggle global.
 * Equivale ao LEFT JOIN d1_operadores_gestor × operador_nome_fantasia,
 * feito em memória (dezenas de linhas, não vale um RPC).
 */
export async function getEquipeAction(): Promise<DataResult<EquipeData>> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const admin = createAdminClient();
  const gestorId = user.profile.id;

  const [rosterRes, apelidosRes, configRes] = await Promise.all([
    admin
      .from("d1_operadores_gestor")
      .select("operador_email")
      .eq("gestor_id", gestorId)
      .order("operador_email", { ascending: true }),
    admin
      .from("operador_nome_fantasia")
      .select("operador_email, nome_fantasia")
      .eq("gestor_id", gestorId),
    admin
      .from("gestor_config_fantasia")
      .select("ativo")
      .eq("gestor_id", gestorId)
      .maybeSingle(),
  ]);

  if (rosterRes.error) {
    console.error("[getEquipeAction] roster:", rosterRes.error.message);
    return { ok: false, error: "Erro ao carregar a equipe." };
  }
  if (apelidosRes.error) {
    console.error("[getEquipeAction] apelidos:", apelidosRes.error.message);
  }

  // Indexado por prefixo do email: o roster guarda @alloha.com, mas apelidos
  // antigos podem ter sido salvos sob @sumicity.net.br.
  const apelidoPorPrefixo = new Map<string, string>();
  for (const row of apelidosRes.data ?? []) {
    const prefixo = row.operador_email.trim().toLowerCase().split("@")[0];
    if (row.nome_fantasia) apelidoPorPrefixo.set(prefixo, row.nome_fantasia);
  }

  const operadores: OperadorEquipe[] = (rosterRes.data ?? []).map((row) => {
    const email = row.operador_email.trim().toLowerCase();
    return { email, apelido: apelidoPorPrefixo.get(email.split("@")[0]) ?? "" };
  });

  return {
    ok: true,
    data: { ativo: configRes.data?.ativo ?? false, operadores },
  };
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
    console.error("[adicionarOperadorAction] duplicata:", checkErr.message);
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
    console.error("[adicionarOperadorAction] insert:", error.message);
    return { ok: false, error: "Erro ao salvar. Tente novamente." };
  }

  revalidatePath("/configuracoes/equipe");
  return { ok: true };
}

/**
 * Remove do roster E apaga o apelido (cascata manual). É o que impede o
 * acúmulo de órfãos em operador_nome_fantasia — a versão antiga só apagava
 * do roster e deixava o apelido para trás.
 */
export async function removerOperadorAction(email: string): Promise<VoidResult> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const emailNorm = email.trim().toLowerCase();
  const admin = createAdminClient();
  const gestorId = user.profile.id;
  const variantes = getEmailVariants(emailNorm);

  const { error } = await admin
    .from("d1_operadores_gestor")
    .delete()
    .eq("gestor_id", gestorId)
    .in("operador_email", variantes);

  if (error) {
    console.error("[removerOperadorAction] roster:", error.message);
    return { ok: false, error: "Erro ao remover. Tente novamente." };
  }

  // Apelido: falha aqui não invalida a remoção do roster (o operador já saiu
  // das tabelas), então só logamos.
  const { error: apelidoErr } = await admin
    .from("operador_nome_fantasia")
    .delete()
    .eq("gestor_id", gestorId)
    .in("operador_email", variantes);

  if (apelidoErr) {
    console.error("[removerOperadorAction] apelido:", apelidoErr.message);
  }

  revalidatePath("/configuracoes/equipe");
  return { ok: true };
}

/**
 * Apelido individual. Vazio apaga o registro em vez de gravar string vazia —
 * assim o operador volta a exibir o nome real derivado do email.
 */
export async function salvarApelidoAction(
  email: string,
  apelido: string,
): Promise<VoidResult> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const emailNorm = email.trim().toLowerCase();
  const apelidoNorm = apelido.trim();
  const admin = createAdminClient();
  const gestorId = user.profile.id;

  if (!apelidoNorm) {
    const { error } = await admin
      .from("operador_nome_fantasia")
      .delete()
      .eq("gestor_id", gestorId)
      .in("operador_email", getEmailVariants(emailNorm));

    if (error) {
      console.error("[salvarApelidoAction] delete:", error.message);
      return { ok: false, error: "Erro ao limpar o apelido." };
    }

    revalidatePath("/configuracoes/equipe");
    return { ok: true };
  }

  const { error } = await admin.from("operador_nome_fantasia").upsert(
    {
      gestor_id: gestorId,
      operador_email: emailNorm,
      nome_fantasia: apelidoNorm,
    },
    { onConflict: "gestor_id,operador_email" },
  );

  if (error) {
    console.error("[salvarApelidoAction] upsert:", error.message);
    return { ok: false, error: "Erro ao salvar o apelido." };
  }

  revalidatePath("/configuracoes/equipe");
  return { ok: true };
}

/** Liga/desliga o uso de apelidos nas tabelas do painel. */
export async function toggleApelidosAction(ativo: boolean): Promise<VoidResult> {
  const user = await gestorLogado();
  if (!user) return { ok: false, error: "Não autorizado." };

  const admin = createAdminClient();

  // upsert só toca nas colunas enviadas — os demais campos da linha
  // (kpi_colunas_visiveis, meta_tx_retencao, olho_*) ficam intactos.
  const { error } = await admin
    .from("gestor_config_fantasia")
    .upsert({ gestor_id: user.profile.id, ativo }, { onConflict: "gestor_id" });

  if (error) {
    console.error("[toggleApelidosAction]", error.message);
    return { ok: false, error: "Erro ao salvar a configuração." };
  }

  revalidatePath("/configuracoes/equipe");
  return { ok: true };
}
