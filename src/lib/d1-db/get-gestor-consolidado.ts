import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix, getEmailVariants } from "@/lib/utils/email-variants";
import { dataRefHojeBR } from "./parse";
import { getRosterOperadoresGestor } from "./get-roster-gestor";
import type {
  ContratoItem,
  GestorConsolidado,
  GestorContrato,
  GestorData,
  GestorOperadorLinha,
  MotivosBreakdown,
  TxPorMotivo,
} from "./types";

/**
 * Linhas de d1_consolidado devidamente tipadas (só os campos usados aqui).
 */
type Row = {
  operator_email: string;
  supervisor: string | null;
  retidos: number | null;
  cancelados: number | null;
  pedidos: number | null;
  tx_retencao: number | null;
  motivos_retidos: MotivosBreakdown | null;
  motivos_cancelados: MotivosBreakdown | null;
  contratos_retidos: ContratoItem[] | null;
  contratos_cancelados: ContratoItem[] | null;
  report_hora: string | null;
  report_nome_supervisor: string | null;
};

const ZERO_BREAKDOWN: MotivosBreakdown = {
  financeiro: 0,
  mudancaEndereco: 0,
  insatisfacaoServico: 0,
  insatisfacaoAtendimento: 0,
  mudancaProvedora: 0,
  outros: 0,
};

function somarBreakdown(a: MotivosBreakdown, b: MotivosBreakdown | null): MotivosBreakdown {
  if (!b) return a;
  return {
    financeiro: a.financeiro + b.financeiro,
    mudancaEndereco: a.mudancaEndereco + b.mudancaEndereco,
    insatisfacaoServico: a.insatisfacaoServico + b.insatisfacaoServico,
    insatisfacaoAtendimento: a.insatisfacaoAtendimento + b.insatisfacaoAtendimento,
    mudancaProvedora: a.mudancaProvedora + b.mudancaProvedora,
    outros: a.outros + b.outros,
  };
}

type GestorConsolidadoResult = {
  data: GestorData;
  reportHora: string | null;
  reportNomeSupervisor: string | null;
};

const EMPTY_RESULT: GestorConsolidadoResult = {
  data: {
    operadores: [],
    consolidado: { gestora: "", retidos: 0, cancelados: 0, pedidos: 0, txRetencao: null },
    contratosRetidos: [],
    contratosCancelados: [],
    motivosConsolidados: { retidos: ZERO_BREAKDOWN, cancelados: ZERO_BREAKDOWN },
    txPorMotivo: {
      financeiro: null,
      mudancaEndereco: null,
      insatisfacaoServico: null,
      insatisfacaoAtendimento: null,
      mudancaProvedora: null,
      outros: null,
    },
  },
  reportHora: null,
  reportNomeSupervisor: null,
};

/**
 * Lê o D-1 Consolidado da equipe de um gestor (d1_consolidado, data de
 * hoje). Substitui fetchGestorData (Sheets) — mesmo shape de retorno
 * (GestorData), pra GestorEquipeSection não precisar mudar.
 *
 * A lista de operadores vem SEMPRE do roster (d1_operadores_gestor), não da
 * tabela de dados do dia — um operador cadastrado na equipe mas sem upload
 * de hoje ainda aparece na lista, só com os números zerados. Só retorna
 * `operadores: []` quando o roster em si está vazio (equipe realmente sem
 * ninguém cadastrado) — esse é o único caso que deve virar o erro "sem
 * equipe" na página.
 */
export async function getGestorConsolidado(gestorId: string): Promise<GestorConsolidadoResult> {
  const admin = createAdminClient();

  const roster = await getRosterOperadoresGestor(gestorId);
  if (roster.length === 0) return EMPTY_RESULT;

  // Filtra por operator_email (via roster de d1_operadores_gestor), NÃO por
  // gestor_id — d1_consolidado tem índice único (data_ref, operator_email),
  // então cada operador só tem UMA linha "dona" de um gestor_id, mesmo
  // quando ele está na equipe de dois gestores. Filtrar por gestor_id faria
  // o dado sumir pro segundo gestor. Inclui as variantes de domínio do
  // roster (@alloha.com/@sumicity.net.br) pra não perder linhas do CSV.
  const emailsComVariantes = roster.flatMap(getEmailVariants);

  const [{ data, error }, { data: gestorProfile }] = await Promise.all([
    admin
      .from("d1_consolidado")
      .select(
        "operator_email, supervisor, retidos, cancelados, pedidos, tx_retencao, motivos_retidos, motivos_cancelados, contratos_retidos, contratos_cancelados, report_hora, report_nome_supervisor",
      )
      .in("operator_email", emailsComVariantes)
      .eq("data_ref", dataRefHojeBR()),
    admin.from("profiles").select("full_name").eq("id", gestorId).maybeSingle(),
  ]);

  if (error) {
    console.error("[get-gestor-consolidado] erro ao buscar d1_consolidado:", error.message);
  }

  const rows = (data ?? []) as Row[];
  const nomeGestor = gestorProfile?.full_name ?? "";
  // Chave por PREFIXO (sem domínio) — a mesma pessoa pode aparecer no CSV
  // como @alloha.com num dia e @sumicity.net.br noutro; o roster só guarda
  // @alloha.com, então o match precisa ignorar o domínio.
  const rowPorPrefixo = new Map(rows.map((row) => [getEmailPrefix(row.operator_email), row]));

  const operadores: GestorOperadorLinha[] = roster.map((email) => {
    const row = rowPorPrefixo.get(getEmailPrefix(email));
    if (!row) {
      return {
        nome: email,
        gestora: nomeGestor,
        retidos: 0,
        cancelados: 0,
        pedidos: 0,
        txRetencao: null,
        motivosRetidos: ZERO_BREAKDOWN,
        motivosCancelados: ZERO_BREAKDOWN,
      };
    }
    // PEDIDOS = RETIDOS + CANCELADOS — derivado aqui (em vez de confiar em
    // row.pedidos) pra não depender de reprocessar o upload sempre que essa
    // regra mudar.
    const retidos = row.retidos ?? 0;
    const cancelados = row.cancelados ?? 0;
    return {
      // Usa o email canônico do roster (@alloha.com), não o valor bruto do
      // CSV — mantém a identidade estável mesmo se o CSV variar de domínio
      // entre uploads (nome-fantasia e a key da tabela dependem disso).
      nome: email,
      gestora: row.supervisor ?? nomeGestor,
      retidos,
      cancelados,
      pedidos: retidos + cancelados,
      txRetencao: row.tx_retencao,
      motivosRetidos: row.motivos_retidos ?? ZERO_BREAKDOWN,
      motivosCancelados: row.motivos_cancelados ?? ZERO_BREAKDOWN,
    };
  });

  let totalRetidos = 0;
  let totalCancelados = 0;
  let motivosRetidos = ZERO_BREAKDOWN;
  let motivosCancelados = ZERO_BREAKDOWN;
  const contratosRetidos: GestorContrato[] = [];
  const contratosCancelados: GestorContrato[] = [];

  for (const row of rows) {
    totalRetidos += row.retidos ?? 0;
    totalCancelados += row.cancelados ?? 0;
    motivosRetidos = somarBreakdown(motivosRetidos, row.motivos_retidos);
    motivosCancelados = somarBreakdown(motivosCancelados, row.motivos_cancelados);

    for (const item of row.contratos_retidos ?? []) {
      contratosRetidos.push({ ...item, operador: row.operator_email });
    }
    for (const item of row.contratos_cancelados ?? []) {
      contratosCancelados.push({ ...item, operador: row.operator_email });
    }
  }

  // PEDIDOS = RETIDOS + CANCELADOS também na linha "EQUIPE" (total geral).
  const totalPedidos = totalRetidos + totalCancelados;

  const consolidado: GestorConsolidado = {
    gestora: rows[0]?.supervisor ?? nomeGestor,
    retidos: totalRetidos,
    cancelados: totalCancelados,
    pedidos: totalPedidos,
    txRetencao: totalPedidos > 0 ? totalRetidos / totalPedidos : null,
  };

  const txDoBucket = (bucket: keyof MotivosBreakdown): number | null => {
    const retidosBucket = motivosRetidos[bucket];
    const canceladosBucket = motivosCancelados[bucket];
    const denom = retidosBucket + canceladosBucket;
    return denom > 0 ? retidosBucket / denom : null;
  };

  const txPorMotivo: TxPorMotivo = {
    financeiro: txDoBucket("financeiro"),
    mudancaEndereco: txDoBucket("mudancaEndereco"),
    insatisfacaoServico: txDoBucket("insatisfacaoServico"),
    insatisfacaoAtendimento: txDoBucket("insatisfacaoAtendimento"),
    mudancaProvedora: txDoBucket("mudancaProvedora"),
    outros: txDoBucket("outros"),
  };

  return {
    data: {
      operadores,
      consolidado,
      contratosRetidos,
      contratosCancelados,
      motivosConsolidados: { retidos: motivosRetidos, cancelados: motivosCancelados },
      txPorMotivo,
    },
    reportHora: rows[0]?.report_hora ?? null,
    reportNomeSupervisor: rows[0]?.report_nome_supervisor ?? null,
  };
}
