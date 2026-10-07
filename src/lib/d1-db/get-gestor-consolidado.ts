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
  gestor_id: string | null;
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
  updated_at: string | null;
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
  /**
   * true quando o banco falhou (equipe ou base do dia). A página mostra um
   * erro em vez de "sem dados"/zeros, e o polling mantém o que já está na
   * tela em vez de zerar.
   */
  erro: boolean;
  /**
   * "Versão" dos dados da equipe no dia (roster + nº de linhas + último
   * updated_at). Muda a cada upload/Limpar Base/mudança de equipe — o
   * polling manda a última conhecida pra pular a busca completa quando nada
   * mudou. Vazia em erro/equipe vazia.
   */
  versao: string;
  /** true quando `versaoConhecida` bateu: `data` vem vazio e não deve ser usado. */
  semMudanca: boolean;
};

const EMPTY_RESULT: GestorConsolidadoResult = {
  data: {
    operadores: [],
    consolidado: { gestora: "", retidos: 0, cancelados: 0, pedidos: 0, txRetencao: null },
  },
  reportHora: null,
  reportNomeSupervisor: null,
  reportDatasBase: null,
  erro: false,
  versao: "",
  semMudanca: false,
};

/** Hash curto (djb2) do roster — entra na versão sem mandar os e-mails de novo. */
function hashRoster(roster: string[]): string {
  let h = 5381;
  for (const ch of roster.join(",")) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

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
export async function getGestorConsolidado(
  gestorId: string,
  /**
   * Versão que o cliente já tem (polling). Se for igual à atual, retorna
   * `semMudanca: true` logo depois das 2 consultas básicas (roster + base),
   * sem buscar perfil, nome do supervisor etc.
   */
  versaoConhecida?: string,
): Promise<GestorConsolidadoResult> {
  const admin = createAdminClient();

  const roster = await getRosterOperadoresGestor(gestorId);
  if (roster.length === 0) {
    // getRosterOperadoresGestor devolve [] tanto pra equipe vazia quanto pra
    // erro de banco (é compartilhado por várias telas, não mexemos nele).
    // Só aqui, no caso vazio, confirma com uma contagem: se falhar, ou se
    // houver operadores cadastrados, o [] veio de erro.
    const { count, error: rosterErr } = await admin
      .from("d1_operadores_gestor")
      .select("id", { count: "exact", head: true })
      .eq("gestor_id", gestorId);
    if (rosterErr) {
      console.error("[get-gestor-consolidado] erro ao conferir a equipe:", rosterErr.message);
    }
    return { ...EMPTY_RESULT, erro: Boolean(rosterErr) || (count ?? 0) > 0 };
  }

  // Filtra por operator_email (via roster de d1_operadores_gestor), NÃO por
  // gestor_id — d1_consolidado tem índice único (data_ref, operator_email),
  // então cada operador só tem UMA linha "dona" de um gestor_id, mesmo
  // quando ele está na equipe de dois gestores. Filtrar por gestor_id faria
  // o dado sumir pro segundo gestor. Inclui as variantes de domínio do
  // roster (@alloha.com/@sumicity.net.br) pra não perder linhas do CSV.
  const emailsComVariantes = roster.flatMap(getEmailVariants);

  const { data, error } = await admin
    .from("d1_consolidado")
    .select(
      "operator_email, gestor_id, supervisor, retidos, cancelados, pedidos, tx_retencao, motivos_retidos, motivos_cancelados, report_hora, report_nome_supervisor, report_datas_base, updated_at",
    )
    .in("operator_email", emailsComVariantes)
    .eq("data_ref", dataRefHojeBR());

  if (error) {
    // Sem a base do dia, a tabela sairia toda zerada como se ninguém tivesse
    // atendido — a página mostra erro em vez disso.
    console.error("[get-gestor-consolidado] erro ao buscar d1_consolidado:", error.message);
    return { ...EMPTY_RESULT, erro: true };
  }

  const rows = (data ?? []) as Row[];

  // Versão: muda com a equipe (roster), com linhas entrando/saindo (upload,
  // Limpar Base) e com qualquer linha regravada (updated_at do upsert).
  const ultimoUpdate = rows.reduce((max, row) => (row.updated_at && row.updated_at > max ? row.updated_at : max), "");
  const versao = `${hashRoster(roster)}:${rows.length}:${ultimoUpdate}`;
  if (versaoConhecida && versaoConhecida === versao) {
    return { ...EMPTY_RESULT, versao, semMudanca: true };
  }

  const { data: gestorProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", gestorId)
    .maybeSingle();
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

  // Cabeçalho (gestora, hora/autor/dias do report) a partir de uma linha
  // DESTE gestor — não de rows[0], que pode ser de outro gestor quando o
  // operador está nas duas equipes (a linha "dona" tem o gestor_id do outro,
  // e o supervisor dela é o nome dele). Os campos report_* são iguais em
  // todas as linhas do dia (vêm do mesmo upload), então rows[0] continua
  // como fallback.
  const linhaCabecalho = rows.find((row) => row.gestor_id === gestorId) ?? rows[0];

  const consolidado: GestorConsolidado = {
    gestora: (linhaCabecalho?.gestor_id === gestorId ? linhaCabecalho.supervisor : null) || nomeGestor,
    retidos: totalRetidos,
    cancelados: totalCancelados,
    pedidos: totalPedidos,
    txRetencao: totalPedidos > 0 ? totalRetidos / totalPedidos : null,
  };

  return {
    data: { operadores, consolidado },
    erro: false,
    versao,
    semMudanca: false,
    reportHora: linhaCabecalho?.report_hora ?? null,
    reportDatasBase: linhaCabecalho?.report_datas_base ?? null,
    // Só formatação de exibição ("GABRIEL HENRIQUE XIMENES DA SILVA" →
    // "Gabriel Ximenes") — ver resolveNomeSupervisorReportExibicao.
    reportNomeSupervisor: await resolveNomeSupervisorReportExibicao(
      admin,
      linhaCabecalho?.report_nome_supervisor ?? null,
    ),
  };
}
