import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";

export type FiltroContratos = {
  escopo: "equipe" | "empresa";
  emailsEquipe: string[];
  operador: string | null; // usuario_login
  status: "retido" | "cancelado" | "todos";
  periodo: { horaInicio: number; horaFim: number } | null;
  motivo: string | null;
  submotivo: string | null;
};

export async function getContratosFiltrados(filtros: FiltroContratos): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase.from("retencao_atendimentos").select("cod_air");

  // Filtro de Escopo e Horas (Reuso)
  query = aplicarFiltroEscopo(query, {
    escopo: filtros.escopo,
    emailsEquipe: filtros.emailsEquipe,
    periodo: filtros.periodo,
  });

  // Filtro por Operador Específico (quando selecionado)
  if (filtros.operador) {
    query = query.eq("usuario_login", filtros.operador);
  }

  // Filtro de Status
  if (filtros.status === "retido") {
    query = query.eq("foi_cancelamento", false);
  } else if (filtros.status === "cancelado") {
    query = query.eq("foi_cancelamento", true);
  }

  // Filtro de Motivo
  if (filtros.motivo) {
    if (filtros.motivo === "Mud. Endereço") {
      query = query.in("motivo", [
        "Mud. Endereço Inviabilidade",
        "Mud. Endereço Viabilidade / Parcial",
        "Mudança de Endereço"
      ]);
    } else if (filtros.motivo === "Mot. Financeiro") {
      query = query.in("motivo", [
        "Problemas Financeiros",
        "Problemas Faturamento",
        "Reajuste de valor / NCC"
      ]);
    } else if (filtros.motivo === "Ins. Atendimento") {
      query = query.eq("motivo", "Insatisfação com o Atendimento");
    } else if (filtros.motivo === "Ins. Serviço") {
      query = query.in("motivo", ["Insatisfação com o Serviço", "Insatisfação com o Produto"]);
    } else if (filtros.motivo === "Mud. Provedora") {
      query = query.in("motivo", [
        "Mudança de Provedor - Qualidade",
        "Mudança de Provedor - Preço",
        "Mudança de Provedor -Preço"
      ]);
    } else if (filtros.motivo === "Outros") {
      query = query.in("motivo", [
        "Óbito do Titular",
        "Cliente diz já ter cancelado",
        "Fraude Contratual",
        "Área de Risco",
        "Cliente fez novo Plano com a Giga+",
        "Cliente fez novo plano com a Giga+"
      ]);
    } else {
      query = query.eq("motivo", filtros.motivo);
    }
  }

  // Filtro de Submotivo
  if (filtros.submotivo) {
    // Note that submotivos in db are unmodified (e.g. "Mud. Endereço Inviabilidade"). 
    // We filter by their original name in the database.
    query = query.eq("submotivo", filtros.submotivo);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getContratosFiltrados] erro ao buscar contratos:", error.message);
    throw new Error(error.message);
  }

  return (data || [])
    .map((r) => r.cod_air)
    .filter((c): c is string => typeof c === "string" && c.trim() !== "");
}
