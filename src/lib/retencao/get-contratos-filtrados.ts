import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { classificarAtendimento, STATUS_RETENCAO_ABORTADO } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";

export type FiltroContratos = {
  emailsEquipe: string[];
  operador: string | null; // usuario_login
  status: "retido" | "cancelado" | "todos";
  periodo: { horaInicio: number; horaFim: number } | null;
  motivo: string | null;
  submotivo: string | null;
};

export type ContratoFiltradoItem = {
  usuarioLogin: string;
  nomeSobrenome: string;
  /** ABORTADO = validação FaceID sem resposta do cliente; só aparece quando o filtro de status é "todos". */
  status: "RETIDO" | "CANCELADO" | "ABORTADO";
  motivo: string;
  codAir: string;
  linhaFormatada: string; // ex: "igor.souza - RETIDO - Mud. Endereço - 503351"
};

export async function getContratosFiltrados(filtros: FiltroContratos): Promise<ContratoFiltradoItem[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("retencao_atendimentos")
    .select("usuario_login, foi_cancelamento, motivo, cod_air, status_retencao");

  // Filtro de Escopo e Horas (Reuso)
  query = aplicarFiltroEscopo(query, {
    emailsEquipe: filtros.emailsEquipe,
    periodo: filtros.periodo,
  });

  // Filtro por Operador Específico (quando selecionado) — cobre as duas
  // variantes de domínio do mesmo operador.
  if (filtros.operador) {
    query = query.in("usuario_login", getEmailVariants(filtros.operador));
  }

  // Filtro de Status
  if (filtros.status === "retido") {
    // "Abortado" também vem com foi_cancelamento=false, mas não é retenção —
    // fica de fora do filtro "Retidos".
    query = query.eq("foi_cancelamento", false).not("status_retencao", "eq", STATUS_RETENCAO_ABORTADO);
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
    query = query.eq("submotivo", filtros.submotivo);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getContratosFiltrados] erro ao buscar contratos:", error.message);
    throw new Error(error.message);
  }

  const rawRows = (data || []).filter(
    (r): r is {
      usuario_login: string | null;
      foi_cancelamento: boolean | null;
      motivo: string | null;
      cod_air: string;
      status_retencao: string | null;
    } => typeof r.cod_air === "string" && r.cod_air.trim() !== ""
  );

  return rawRows.map((r) => {
    const usuarioLogin = r.usuario_login || "";
    const nomeSobrenome = formatNomeDotSobrenome(usuarioLogin);
    const classe = classificarAtendimento(r);
    const statusStr: "RETIDO" | "CANCELADO" | "ABORTADO" =
      classe === "cancelado" ? "CANCELADO" : classe === "abortado" ? "ABORTADO" : "RETIDO";
    const motivoStr = r.motivo?.trim() || "Outros";
    const codAirStr = r.cod_air.trim();

    const linhaFormatada = `${nomeSobrenome} - ${statusStr} - ${motivoStr} - ${codAirStr}`;

    return {
      usuarioLogin,
      nomeSobrenome,
      status: statusStr,
      motivo: motivoStr,
      codAir: codAirStr,
      linhaFormatada,
    };
  });
}
