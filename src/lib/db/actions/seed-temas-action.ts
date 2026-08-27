"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type SeedTemasResult =
  | { success: true; inseridos: number }
  | { success: false; error: string };

// Textos propostos em docs/pages/diario-de-bordo.md (seção "Textos iniciais
// propostos (PAUSA)"). O ADM ajusta/adiciona depois pelo CRUD.
const TEMAS_PAUSA_PADRAO = [
  {
    nome: "Auxílio à operação",
    texto_motivo:
      "ao auxílio prestado à operação de Retenção como um todo, em razão da ausência de uma supervisão no dia. O registro da pausa foi autorizado pela supervisão em um dia sem fluxo, não impactando a operação",
  },
  {
    nome: "Erro de acesso aos sistemas",
    texto_motivo:
      "a um erro em seus acessos aos sistemas de atendimento. O acesso foi normalizado apenas mais tarde, permitindo o retorno às atividades",
  },
  {
    nome: "Reunião após 20h (SAC)",
    texto_motivo:
      "à participação em reunião realizada após as 20:00, no fim de turno. O agente estava com skill de SAC em andamento e foi autorizado o registro da pausa para participação na reunião, em função da queda de clientes no SAC",
  },
  {
    nome: "Saúde / SAC Texto",
    texto_motivo:
      "a motivos de saúde que impossibilitaram a realização de atendimentos por voz. O agente foi autorizado pela supervisão a atuar exclusivamente no SAC Texto e, devido à necessidade de adequação à NR17, foi registrado o período, resultando no tempo informado",
  },
  {
    nome: "Normalização de acessos (novato) SAC Texto",
    texto_motivo:
      "ao processo de normalização de acessos como agente novato. Durante o período, atuou exclusivamente no SAC Texto e, por esse motivo, foi autorizado o registro da pausa pela supervisão para adequação da NR17 do dia",
  },
  {
    nome: "Alinhamento interno / feedback",
    texto_motivo:
      "à participação em alinhamento interno relacionado às demandas operacionais e de atendimento. O registro foi autorizado pela supervisão em um momento de baixa demanda, sem impacto para a operação",
  },
  {
    nome: "SAC Texto / NR17 (padrão)",
    texto_motivo:
      "ao atendimento em SAC Texto. O registro foi necessário para adequação e retirada da NR17 do dia, conforme procedimento operacional",
  },
  {
    nome: "Demanda interna",
    texto_motivo:
      "a uma demanda interna com alguns agentes da retenção. O registro foi autorizado pela supervisão em um dia sem fluxo, sem impacto para a operação",
  },
  {
    nome: "Erro de sistema (SYDLE)",
    texto_motivo:
      "a erro de acesso no sistema SYDLE, que impossibilitava o início e a finalização das retenções. O agente permaneceu em pausa até a resolução do problema, com acesso normalizado no mesmo dia",
  },
  {
    nome: "Atendimento crítico",
    texto_motivo:
      "à necessidade de assumir um atendimento crítico envolvendo cliente e colaborador da mesma equipe. O registro da pausa foi autorizado para viabilizar a condução do caso e aumentar a chance de retenção",
  },
] as const;

const TEMAS_TEMPO_LOGADO_PADRAO = [
  {
    nome: "Problema técnico de acesso",
    texto_motivo:
      "enfrentou problemas técnicos de acesso aos sistemas de atendimento, o que impactou diretamente o tempo logado no dia",
  },
  {
    nome: "Saída autorizada pela supervisão",
    texto_motivo:
      "teve a saída antecipada autorizada pela supervisão em função de uma demanda pontual, sem impacto para a operação",
  },
] as const;

/**
 * Insere os temas padrão (10 de pausa + 2 de tempo logado) — só executa se
 * db_temas estiver totalmente vazia, pra não duplicar em cliques repetidos.
 */
export async function seedTemasPadraoAction(): Promise<SeedTemasResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = createAdminClient();

  const { count, error: countError } = await supabase
    .from("db_temas")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("[seed-temas] erro ao verificar temas existentes:", countError.message);
    return { success: false, error: "Erro ao verificar temas existentes" };
  }

  if ((count ?? 0) > 0) {
    return { success: false, error: "Já existem temas cadastrados" };
  }

  const rows = [
    ...TEMAS_PAUSA_PADRAO.map((t) => ({ ...t, tipo: "pausa" as const })),
    ...TEMAS_TEMPO_LOGADO_PADRAO.map((t) => ({
      ...t,
      tipo: "tempo_logado" as const,
    })),
  ];

  const { error } = await supabase.from("db_temas").insert(rows);

  if (error) {
    console.error("[seed-temas] erro ao inserir:", error.message);
    return { success: false, error: "Erro ao inserir temas padrão" };
  }

  revalidatePath("/config/db");
  return { success: true, inseridos: rows.length };
}
