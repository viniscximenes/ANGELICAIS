import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNomeSupervisorReportExibicao } from "@/lib/gestor/resolve-nome-supervisor-report";
import { getEmailPrefix, getEmailVariants } from "@/lib/utils/email-variants";
import { dataRefHojeBR } from "./parse";
import { getRosterOperadoresGestor } from "./get-roster-gestor";
import type {
  GestorConsolidado,
  GestorData,
  GestorOperadorLinha,
  MotivosBreakdown,
} from "./types";

/**
 * Linhas de d1_consolidado devidamente tipadas (só os campos usados aqui).
 *
 * contratos_retidos/contratos_cancelados (JSON com nome do cliente) NÃO são
 * buscados: nenhuma tela que usa esta função exibe contratos — o "Copiar
 * contratos" do Analítico lê retencao_atendimentos. Antes vinham em todo
 * poll de 30s só pra serem descartados.
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
  report_hora: string | null;
  report_nome_supervisor: string | null;
  report_datas_base: string[] | null;
};

const ZERO_BREAKDOWN: MotivosBreakdown = {
  financeiro: 0,
  mudancaEndereco: 0,
  insatisfacaoServico: 0,
  insatisfacaoAtendimento: 0,
  mudancaProvedora: 0,
  outros: 0,
};

type GestorConsolidadoResult = {
  /** Só o que page.tsx e refreshConsolidadoAction usam (linhas + total da equipe). */
  data: Pick<GestorData, "operadores" | "consolidado">;
  reportHora: string | null;
  reportNomeSupervisor: string | null;
  /** Dias (YYYY-MM-DD, em ordem) da base do último upload — null em uploads antigos. */
  reportDatasBase: string[] | null;
};

const EMPTY_RESULT: GestorConsolidadoResult = {
  data: {
    operadores: [],
    consolidado: { gestora: "", retidos: 0, cancelados: 0, pedidos: 0, txRetencao: null },
  },
  reportHora: null,
  reportNomeSupervisor: null,
  reportDatasBase: null,
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
        "operator_email, supervisor, retidos, cancelados, pedidos, tx_retencao, motivos_retidos, motivos_cancelados, report_hora, report_nome_supervisor, report_datas_base",
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

  // Total da linha "EQUIPE" = soma das MESMAS linhas exibidas na tabela.
  // Antes somava todas as `rows` — se o mesmo operador tivesse linha com
  // @alloha.com e com @sumicity.net.br no dia (o índice único é pelo e-mail
  // completo), a tabela mostrava uma e o total contava as duas.
  let totalRetidos = 0;
  let totalCancelados = 0;
  for (const op of operadores) {
    totalRetidos += op.retidos;
    totalCancelados += op.cancelados;
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

  return {
    data: { operadores, consolidado },
    reportHora: rows[0]?.report_hora ?? null,
    reportDatasBase: rows[0]?.report_datas_base ?? null,
    // Só formatação de exibição ("GABRIEL HENRIQUE XIMENES DA SILVA" →
    // "Gabriel Ximenes") — ver resolveNomeSupervisorReportExibicao.
    reportNomeSupervisor: await resolveNomeSupervisorReportExibicao(
      admin,
      rows[0]?.report_nome_supervisor ?? null,
    ),
  };
}
