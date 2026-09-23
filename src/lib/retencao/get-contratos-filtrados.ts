import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailVariants } from "@/lib/utils/email-variants";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { dedupePorContrato } from "./dedupe-por-contrato";
import { classificarAtendimento } from "./classificar-atendimento";
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
  /** ABORTADO = validação FaceID sem resposta do cliente (status_retencao "Abortado - ..."); só aparece quando o filtro de status é "todos". */
  status: "RETIDO" | "CANCELADO" | "ABORTADO";
  motivo: string;
  codAir: string;
  linhaFormatada: string; // ex: "igor.souza - RETIDO - Mud. Endereço - 503351"
};

type LinhaCrua = {
  usuario_login: string | null;
  foi_cancelamento: boolean | null;
  motivo: string | null;
  submotivo: string | null;
  cod_air: string | null;
  status_retencao: string | null;
  primeiro_nivel: string | null;
  status_hora: string | null;
  hora_bucket: number | null;
};

/** Mesmos agrupamentos de motivo usados no filtro do popover "Copiar Contratos". */
function motivoCombina(motivo: string, filtro: string): boolean {
  switch (filtro) {
    case "Mud. Endereço":
      return [
        "Mud. Endereço Inviabilidade",
        "Mud. Endereço Viabilidade / Parcial",
        "Mudança de Endereço",
      ].includes(motivo);
    case "Mot. Financeiro":
      return ["Problemas Financeiros", "Problemas Faturamento", "Reajuste de valor / NCC"].includes(
        motivo,
      );
    case "Ins. Atendimento":
      return motivo === "Insatisfação com o Atendimento";
    case "Ins. Serviço":
      return ["Insatisfação com o Serviço", "Insatisfação com o Produto"].includes(motivo);
    case "Mud. Provedora":
      return [
        "Mudança de Provedor - Qualidade",
        "Mudança de Provedor - Preço",
        "Mudança de Provedor -Preço",
      ].includes(motivo);
    case "Outros":
      return [
        "Óbito do Titular",
        "Cliente diz já ter cancelado",
        "Fraude Contratual",
        "Área de Risco",
        "Cliente fez novo Plano com a Giga+",
        "Cliente fez novo plano com a Giga+",
      ].includes(motivo);
    default:
      return motivo === filtro;
  }
}

export async function getContratosFiltrados(filtros: FiltroContratos): Promise<ContratoFiltradoItem[]> {
  const supabase = createAdminClient();

  // Busca SEM os filtros de status/período/motivo/submotivo na query SQL —
  // eles precisam ser aplicados DEPOIS da deduplicação por contrato (ver
  // dedupe-por-contrato.ts), não linha a linha. Motivo: um contrato com
  // várias tentativas pode ter uma linha "Abortado" (foi_cancelamento=false)
  // seguida da linha final "Cancelado" (foi_cancelamento=true) — filtrar
  // "status=retido" (foi_cancelamento=false) NA QUERY buscaria só a
  // tentativa abortada e nunca traria a linha final de verdade pra dedupe
  // decidir, dando um resultado errado. O mesmo vale pra período (hora_bucket)
  // e motivo: o que importa é o valor da linha FINAL do contrato, não de
  // uma tentativa intermediária.
  //
  // Paginação (.range, como os demais get-*.ts): sem isso, mais de 1000
  // linhas no escopo cortariam contratos fora da dedupe silenciosamente.
  let allData: LinhaCrua[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("retencao_atendimentos")
      .select(
        "usuario_login, foi_cancelamento, motivo, submotivo, cod_air, status_retencao, primeiro_nivel, status_hora, hora_bucket",
      )
      .range(from, to);

    query = aplicarFiltroEscopo(query, { emailsEquipe: filtros.emailsEquipe });

    // Filtro por Operador Específico (quando selecionado) — cobre as duas
    // variantes de domínio do mesmo operador. Seguro em SQL: não depende de
    // classificação, é uma propriedade fixa da linha.
    if (filtros.operador) {
      query = query.in("usuario_login", getEmailVariants(filtros.operador));
    }

    const { data, error } = await query;
    if (error) {
      console.error("[getContratosFiltrados] erro ao buscar contratos:", error.message);
      throw new Error(error.message);
    }

    const list = data || [];
    allData = allData.concat(list);

    if (list.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  const comContrato = allData.filter(
    (r): r is LinhaCrua & { cod_air: string } => typeof r.cod_air === "string" && r.cod_air.trim() !== "",
  );

  // Uma linha final por (operador, contrato) — a de status_hora mais
  // recente. Classificação puramente por linha, sem histórico.
  const linhasFinais = dedupePorContrato(comContrato);

  const resultado: ContratoFiltradoItem[] = [];

  for (const r of linhasFinais) {
    const classe = classificarAtendimento(r);
    const statusStr: "RETIDO" | "CANCELADO" | "ABORTADO" =
      classe === "cancelado" ? "CANCELADO" : classe === "abortado" ? "ABORTADO" : "RETIDO";

    // Filtro de Status — aplicado na linha final já classificada (dedupe +
    // exclusão de FaceID já refletidas em `classe`).
    if (filtros.status === "retido" && classe !== "retido") continue;
    if (filtros.status === "cancelado" && classe !== "cancelado") continue;

    // Filtro de Período (hora_bucket da linha final do contrato).
    if (filtros.periodo) {
      const h = r.hora_bucket;
      if (h === null || h === undefined || h < filtros.periodo.horaInicio || h > filtros.periodo.horaFim) {
        continue;
      }
    }

    const motivoStr = r.motivo?.trim() || "Outros";

    // Filtro de Motivo (mesmos agrupamentos de antes).
    if (filtros.motivo && !motivoCombina(motivoStr, filtros.motivo)) continue;

    // Filtro de Submotivo.
    if (filtros.submotivo && r.submotivo !== filtros.submotivo) continue;

    const usuarioLogin = r.usuario_login || "";
    const nomeSobrenome = formatNomeDotSobrenome(usuarioLogin);
    const codAirStr = r.cod_air.trim();
    const linhaFormatada = `${nomeSobrenome} - ${statusStr} - ${motivoStr} - ${codAirStr}`;

    resultado.push({
      usuarioLogin,
      nomeSobrenome,
      status: statusStr,
      motivo: motivoStr,
      codAir: codAirStr,
      linhaFormatada,
    });
  }

  return resultado;
}
