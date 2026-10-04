import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { resolveNomeSupervisorReportExibicao } from "@/lib/gestor/resolve-nome-supervisor-report";
import { classificarAtendimento } from "@/lib/retencao/classificar-atendimento";
import { dedupePorContrato } from "@/lib/retencao/dedupe-por-contrato";
import { BUCKETS, bucketDe } from "@/lib/retencao/get-evolucao-hora";
import { normalizarTema } from "@/lib/retencao/normalizar-tema";
import { NOME_ESTADO, ufDaUnidade } from "@/lib/retencao/uf-por-unidade";
import { getEmailPrefix } from "@/lib/utils/email-variants";

import {
  MIN_PEDIDOS_BAIXO_RENDIMENTO,
  TIPOS_RETENCAO,
  type AtendimentoTecnico,
  type JornadaAborto,
  type ContagemTipoRetencao,
  type CoordenadorConsolidado,
  type RecorteTaxa,
  type RegionalTaxa,
  type TipoRetencao,
  type HoraPolo,
  type OperadorLinha,
  type ResumoTaxa,
  type SubmotivoTema,
  type SupervisorLinha,
  type TemaPolo,
  type Turno,
} from "./types";

export * from "./types";

/** Login antes das 14:00 = manhã; a partir das 14:00 = tarde. */
const HORA_CORTE_TURNO = 14;

const SEM_SUPERVISOR = "sem-supervisor";

function jornadaVazia(): JornadaAborto {
  return { tentativasAbortadas: 0, contratosComAborto: 0, terminaramAbortados: 0, viraramCancelamento: 0, viraramRetencao: 0 };
}

const ehAbortado = (status: string | null) => (status ?? "").trim().toLowerCase().startsWith("abortado");

/**
 * Agrupamento de temas da visão do coordenador: o mesmo de normalizarTema
 * (compartilhado com as páginas do supervisor) + motivos que o coordenador
 * pediu para cair em "Outros". Feito aqui, não em normalizar-tema.ts, para não
 * alterar as telas do supervisor.
 */
const MOTIVOS_EM_OUTROS = new Set(["contrato temporário para evento"]);
function temaCoordenador(motivo: string | null): string {
  if (MOTIVOS_EM_OUTROS.has((motivo ?? "").trim().toLowerCase())) return "Outros";
  return normalizarTema(motivo);
}

function contagemTiposVazia(): ContagemTipoRetencao {
  return Object.fromEntries(TIPOS_RETENCAO.map((t) => [t, 0])) as ContagemTipoRetencao;
}

/** status_retencao de um RETIDO → tipo de retenção (custo da retenção). */
function tipoRetencaoDe(status: string | null): TipoRetencao {
  const s = (status ?? "").toLowerCase();
  if (s.includes("sem concess")) return "Sem concessão";
  if (s.includes("troca de plano") && s.includes("desconto")) return "Troca de plano + desconto";
  if (s.includes("troca de plano")) return "Troca de plano";
  if (s.includes("desconto")) return "Desconto";
  if (s.includes("negocia")) return "Negociação";
  return "Outros";
}

function paraRecortes(mapa: Map<string, ResumoTaxa & { detalhe?: string }>): RecorteTaxa[] {
  return [...mapa.entries()].map(([chave, v]) => ({ chave, ...v }));
}

const LABEL_BUCKET = new Map(BUCKETS.map((b) => [b.hora, b.label]));

function turnoPorHora(hora: string | null): Turno | null {
  if (!hora) return null;
  const h = Number.parseInt(hora.split(":")[0] ?? "", 10);
  if (Number.isNaN(h)) return null;
  return h < HORA_CORTE_TURNO ? "manha" : "tarde";
}

function resumoVazio(): ResumoTaxa {
  return { retidos: 0, cancelados: 0, pedidos: 0, txRetencao: null };
}

function somar(alvo: ResumoTaxa, retidos: number, cancelados: number) {
  alvo.retidos += retidos;
  alvo.cancelados += cancelados;
  alvo.pedidos = alvo.retidos + alvo.cancelados;
  alvo.txRetencao = alvo.pedidos > 0 ? alvo.retidos / alvo.pedidos : null;
}

/**
 * Quanto a taxa do total subiria sem a parcela (retidos/cancelados) de uma
 * equipe. null quando a equipe é o total inteiro ou não tem pedidos.
 */
function impactoSemEquipe(
  total: { retidos: number; cancelados: number },
  equipe: { retidos: number; cancelados: number },
): number | null {
  const pedidosTotal = total.retidos + total.cancelados;
  const pedidosEquipe = equipe.retidos + equipe.cancelados;
  const pedidosSem = pedidosTotal - pedidosEquipe;
  if (pedidosTotal === 0 || pedidosEquipe === 0 || pedidosSem === 0) return null;
  const txTotal = total.retidos / pedidosTotal;
  const txSem = (total.retidos - equipe.retidos) / pedidosSem;
  return txSem - txTotal;
}

const formatHorarioBR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function horarioDe(statusHora: string | null): string | null {
  if (!statusHora) return null;
  const d = new Date(statusHora);
  return Number.isNaN(d.getTime()) ? null : formatHorarioBR.format(d);
}

type AtendimentoRow = {
  usuario_login: string | null;
  cod_air: string | null;
  status_hora: string | null;
  hora_bucket: number | null;
  foi_cancelamento: boolean | null;
  status_retencao: string | null;
  motivo: string | null;
  submotivo: string | null;
  comprador_nome: string | null;
  primeiro_nivel: string | null;
  marca: string | null;
  unidade_sigla: string | null;
  unidade_nome: string | null;
};

async function buscarAtendimentos(admin: ReturnType<typeof createAdminClient>): Promise<AtendimentoRow[]> {
  const pageSize = 1000;
  let todas: AtendimentoRow[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await admin
      .from("retencao_atendimentos")
      .select(
        "usuario_login, cod_air, status_hora, hora_bucket, foi_cancelamento, status_retencao, motivo, submotivo, comprador_nome, primeiro_nivel, marca, unidade_sigla, unidade_nome",
      )
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) {
      console.error("[get-coordenador-consolidado] retencao_atendimentos:", error.message);
      break;
    }
    todas = todas.concat((data ?? []) as AtendimentoRow[]);
    if (!data || data.length < pageSize) break;
  }
  return todas;
}

/**
 * Visão do polo inteiro pro COORDENADOR, com a mesma base do Consolidado do
 * gestor:
 * - números por operador/supervisor/turno: d1_consolidado do dia (mesmos
 *   valores que cada supervisor vê na própria tela);
 * - temas, evolução por hora e detalhe técnico do operador:
 *   retencao_atendimentos (a base bruta do mesmo upload), com as MESMAS
 *   regras do upload (dedupe por contrato, "Abortado" fora) e restrita aos
 *   operadores que estão no d1_consolidado — assim os totais batem.
 *
 * Supervisor do operador: gestor_id da linha do d1_consolidado (o mesmo que
 * o upload gravou); roster (d1_operadores_gestor) só completa quem ainda não
 * tem linha no dia.
 *
 * Turno: pelo horário de login do operador (d1_tempo_logado). Quem não tem
 * login registrado herda o turno majoritário da equipe do supervisor; o
 * turno do supervisor é o turno da maioria dos operadores dele.
 *
 * @param metaTx Meta de taxa de retenção em % (0–100).
 */
export async function getCoordenadorConsolidado(metaTx: number): Promise<CoordenadorConsolidado> {
  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();

  const [consolidadoRes, tempoRes, rosterRes, gestoresRes, atendimentosBrutos] = await Promise.all([
    admin
      .from("d1_consolidado")
      .select("operator_email, gestor_id, retidos, cancelados, report_hora, report_nome_supervisor")
      .eq("data_ref", dataRef),
    admin.from("d1_tempo_logado").select("operator_email, hora_login").eq("data_ref", dataRef),
    admin.from("d1_operadores_gestor").select("gestor_id, operador_email"),
    admin
      .from("profiles")
      .select("id, full_name, email_corporativo, username")
      .eq("role", "GESTOR")
      .eq("is_active", true),
    buscarAtendimentos(admin),
  ]);

  if (consolidadoRes.error) {
    console.error("[get-coordenador-consolidado] d1_consolidado:", consolidadoRes.error.message);
  }

  const linhas = consolidadoRes.data ?? [];
  const metaFracao = metaTx / 100;

  // Turno do operador, em ordem de prioridade:
  // 1) horário de login (d1_tempo_logado do dia);
  // 2) hora do PRIMEIRO atendimento do dia (retencao_atendimentos — vem no
  //    mesmo upload do Consolidado, então sempre existe quando há dado).
  // Sem o (2), um dia em que a base de Tempo Logado ainda não foi anexada
  // (ou foi limpa) deixava todo mundo sem turno e zerava Manhã/Tarde.
  // (3) turno da maioria da equipe — aplicado mais abaixo (turnoDoGestor).
  const turnoPorPrefixo = new Map<string, Turno | null>();
  for (const row of tempoRes.data ?? []) {
    const turno = turnoPorHora(row.hora_login);
    if (turno) turnoPorPrefixo.set(getEmailPrefix(row.operator_email), turno);
  }
  const primeiraHoraPorPrefixo = new Map<string, number>();
  for (const row of atendimentosBrutos) {
    if (!row.usuario_login || row.hora_bucket === null || row.hora_bucket === undefined) continue;
    const prefixo = getEmailPrefix(row.usuario_login);
    const atual = primeiraHoraPorPrefixo.get(prefixo);
    if (atual === undefined || row.hora_bucket < atual) primeiraHoraPorPrefixo.set(prefixo, row.hora_bucket);
  }
  for (const [prefixo, hora] of primeiraHoraPorPrefixo) {
    if (!turnoPorPrefixo.has(prefixo)) turnoPorPrefixo.set(prefixo, hora < HORA_CORTE_TURNO ? "manha" : "tarde");
  }

  // Nome curto (primeiro + último) — os nomes completos não cabem na
  // tabela/gráfico. Ex.: "GABRIEL HENRIQUE XIMENES DA SILVA" → "Gabriel Silva".
  const nomeCurto = (full: string) => {
    const partes = formatNomeProprio(full).split(" ").filter(Boolean);
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : (partes[0] ?? "");
  };
  const nomeGestor = new Map<string, string>(
    (gestoresRes.data ?? []).map((g) => [g.id, nomeCurto(g.full_name ?? "")]),
  );
  const nomeDoGestor = (id: string) => nomeGestor.get(id) ?? "Sem supervisor";
  // Login real do supervisor = parte local do email corporativo
  // (gabriel.ximenes@alloha.com → gabriel.ximenes); username como reserva.
  const loginGestor = new Map<string, string>(
    (gestoresRes.data ?? []).map((g) => [
      g.id,
      (g.email_corporativo ? getEmailPrefix(g.email_corporativo) : "") || (g.username ?? "").trim().toLowerCase(),
    ]),
  );
  const loginDoGestor = (id: string) => loginGestor.get(id) || nomeDoGestor(id);
  // Exibição do supervisor em toda a página = nome.sobrenome do email.
  const exibicaoGestor = (id: string) => (id === SEM_SUPERVISOR ? "Sem supervisor" : loginDoGestor(id));

  // ── Operadores do dia (d1_consolidado) + roster sem dado ──────────────
  type OperadorDia = {
    email: string;
    prefixo: string;
    gestorId: string;
    retidos: number;
    cancelados: number;
    turnoLogin: Turno | null;
    semDado: boolean;
  };

  const operadoresDia = new Map<string, OperadorDia>();
  for (const row of linhas) {
    const prefixo = getEmailPrefix(row.operator_email);
    operadoresDia.set(prefixo, {
      email: row.operator_email.trim().toLowerCase(),
      prefixo,
      gestorId: row.gestor_id ?? SEM_SUPERVISOR,
      retidos: row.retidos ?? 0,
      cancelados: row.cancelados ?? 0,
      turnoLogin: turnoPorPrefixo.get(prefixo) ?? null,
      semDado: false,
    });
  }
  for (const row of rosterRes.data ?? []) {
    const prefixo = getEmailPrefix(row.operador_email);
    if (operadoresDia.has(prefixo)) continue;
    operadoresDia.set(prefixo, {
      email: row.operador_email.trim().toLowerCase(),
      prefixo,
      gestorId: row.gestor_id,
      retidos: 0,
      cancelados: 0,
      turnoLogin: turnoPorPrefixo.get(prefixo) ?? null,
      semDado: true,
    });
  }

  // Turno majoritário por supervisor (só quem trabalhou no dia conta).
  const contagemTurno = new Map<string, { manha: number; tarde: number }>();
  for (const op of operadoresDia.values()) {
    if (!op.turnoLogin) continue;
    const c = contagemTurno.get(op.gestorId) ?? { manha: 0, tarde: 0 };
    c[op.turnoLogin] += 1;
    contagemTurno.set(op.gestorId, c);
  }
  const turnoDoGestor = (gestorId: string): Turno | null => {
    const c = contagemTurno.get(gestorId);
    if (!c) return null;
    return c.manha >= c.tarde ? "manha" : "tarde";
  };

  const polo = resumoVazio();
  const manha = resumoVazio();
  const tarde = resumoVazio();
  const porGestor = new Map<string, SupervisorLinha>();
  const operadores: OperadorLinha[] = [];
  const turnoDoOperador = new Map<string, Turno | null>();

  for (const op of operadoresDia.values()) {
    const turno = op.turnoLogin ?? turnoDoGestor(op.gestorId);
    turnoDoOperador.set(op.prefixo, turno);
    const pedidos = op.retidos + op.cancelados;
    const tx = pedidos > 0 ? op.retidos / pedidos : null;

    operadores.push({
      email: op.email,
      login: op.prefixo,
      gestorId: op.gestorId,
      supervisor: exibicaoGestor(op.gestorId),
      turno,
      semDado: op.semDado,
      abortados: 0,
      retidos: op.retidos,
      cancelados: op.cancelados,
      pedidos,
      txRetencao: tx,
    });

    if (op.semDado) continue;

    somar(polo, op.retidos, op.cancelados);
    if (turno === "manha") somar(manha, op.retidos, op.cancelados);
    if (turno === "tarde") somar(tarde, op.retidos, op.cancelados);

    let sup = porGestor.get(op.gestorId);
    if (!sup) {
      sup = {
        gestorId: op.gestorId,
        nome: exibicaoGestor(op.gestorId),
        login: loginDoGestor(op.gestorId),
        turno: turnoDoGestor(op.gestorId),
        operadores: 0,
        abaixoDaMeta: 0,
        impactoPolo: null,
        abortados: 0,
        faceIdNaoRealizado: 0,
        jornadaAborto: jornadaVazia(),
        semProducao: 0,
        tiposRetencao: contagemTiposVazia(),
        temas: {},
        ...resumoVazio(),
      };
      porGestor.set(op.gestorId, sup);
    }
    sup.operadores += 1;
    if (tx !== null && tx < metaFracao) sup.abaixoDaMeta += 1;
    somar(sup, op.retidos, op.cancelados);
  }

  for (const sup of porGestor.values()) {
    sup.impactoPolo = impactoSemEquipe(polo, sup);
  }
  for (const op of operadores) {
    if (op.semDado) {
      const sup = porGestor.get(op.gestorId);
      if (sup) sup.semProducao += 1;
    }
  }
  const operadorPorLogin = new Map(operadores.map((op) => [op.login, op]));

  // Manhã em cima, tarde embaixo; dentro do turno, ordem alfabética.
  const ordemTurno = (t: Turno | null) => (t === "manha" ? 0 : t === "tarde" ? 1 : 2);
  const supervisores = [...porGestor.values()].sort(
    (a, b) => ordemTurno(a.turno) - ordemTurno(b.turno) || a.nome.localeCompare(b.nome, "pt-BR"),
  );

  // Pior primeiro; empate de taxa → quem tem mais pedidos (maior impacto).
  const baixoRendimento = operadores
    .filter(
      (op) =>
        op.txRetencao !== null &&
        op.txRetencao < metaFracao &&
        op.pedidos >= MIN_PEDIDOS_BAIXO_RENDIMENTO,
    )
    .sort((a, b) => (a.txRetencao ?? 0) - (b.txRetencao ?? 0) || b.pedidos - a.pedidos);

  // ── Base bruta: temas, evolução por hora e detalhe técnico ────────────
  const gestorDoPrefixo = new Map(
    [...operadoresDia.values()].filter((o) => !o.semDado).map((o) => [o.prefixo, o.gestorId]),
  );

  const atendimentosPorOperador: Record<string, AtendimentoTecnico[]> = {};
  const temasMap = new Map<
    string,
    ResumoTaxa & { canceladosManha: number; canceladosTarde: number; subs: Map<string, SubmotivoTema> }
  >();
  const horasMap = new Map<number, { total: ResumoTaxa; porGestor: Map<string, ResumoTaxa> }>();
  const tiposRetencaoPolo = contagemTiposVazia();
  const abortadosPorStatus = new Map<string, number>();
  let totalAbortados = 0;
  let totalFaceIdNaoRealizado = 0;
  const marcasMap = new Map<string, ResumoTaxa>();
  const unidadesMap = new Map<string, ResumoTaxa & { detalhe?: string }>();
  for (const b of BUCKETS) horasMap.set(b.hora, { total: resumoVazio(), porGestor: new Map() });

  // Tentativas abortadas na base BRUTA (antes do dedupe): um contrato pode
  // abortar no Face ID e depois ser cancelado/retido numa nova tentativa — o
  // dedupe só enxerga o desfecho final, então o aborto do meio sumiria.
  const jornadaPolo = jornadaVazia();
  const contratosComAborto = new Set<string>();
  for (const row of atendimentosBrutos) {
    if (!row.usuario_login || !ehAbortado(row.status_retencao)) continue;
    const prefixoB = getEmailPrefix(row.usuario_login.trim().toLowerCase());
    const gestorB = gestorDoPrefixo.get(prefixoB);
    if (!gestorB) continue;
    const status = (row.status_retencao ?? "Abortado").trim();
    abortadosPorStatus.set(status, (abortadosPorStatus.get(status) ?? 0) + 1);
    jornadaPolo.tentativasAbortadas += 1;
    const supB = porGestor.get(gestorB);
    if (supB) supB.jornadaAborto.tentativasAbortadas += 1;
    if (row.cod_air?.trim()) contratosComAborto.add(`${prefixoB}::${row.cod_air.trim()}`);
  }

  for (const row of dedupePorContrato(atendimentosBrutos)) {
    if (!row.usuario_login) continue;
    const prefixo = getEmailPrefix(row.usuario_login.trim().toLowerCase());
    const gestorId = gestorDoPrefixo.get(prefixo);
    // Fora do d1_consolidado (operador sem supervisor no upload) — fica de
    // fora aqui também, senão temas/evolução não batem com os cards.
    if (!gestorId) continue;

    const classe = classificarAtendimento(row);
    // Desfecho final de um contrato que abortou em alguma tentativa.
    if (row.cod_air?.trim() && contratosComAborto.has(`${prefixo}::${row.cod_air.trim()}`)) {
      const jSup = porGestor.get(gestorId)?.jornadaAborto;
      for (const j of jSup ? [jornadaPolo, jSup] : [jornadaPolo]) {
        j.contratosComAborto += 1;
        if (classe === "abortado") j.terminaramAbortados += 1;
        else if (classe === "cancelado") j.viraramCancelamento += 1;
        else j.viraramRetencao += 1;
      }
    }
    if (classe === "abortado") {
      totalAbortados += 1;
      const status = (row.status_retencao ?? "Abortado").trim();
      const naoRealizado = status.toLowerCase().startsWith("abortado - faceid não realizado");
      if (naoRealizado) totalFaceIdNaoRealizado += 1;
      const supAb = porGestor.get(gestorId);
      if (supAb) {
        supAb.abortados += 1;
        if (naoRealizado) supAb.faceIdNaoRealizado += 1;
      }
      const opAb = operadorPorLogin.get(prefixo);
      if (opAb) opAb.abortados += 1;
      continue;
    }
    const cancelado = classe === "cancelado";
    const r = cancelado ? 0 : 1;
    const c = cancelado ? 1 : 0;

    const tema = temaCoordenador(row.motivo);
    const motivo = (row.motivo ?? "").trim() || "Sem Motivo";
    const submotivo = (row.submotivo ?? "").trim() || "Sem Submotivo";

    const tipoRetencao = cancelado ? null : tipoRetencaoDe(row.status_retencao);
    const marca = (row.marca ?? "").trim() || "Sem marca";
    const unidadeSigla = (row.unidade_sigla ?? "").trim() || "—";
    const unidadeNome = (row.unidade_nome ?? "").trim();

    const supAt = porGestor.get(gestorId);
    if (supAt) {
      if (tipoRetencao) supAt.tiposRetencao[tipoRetencao] += 1;
      const tt = (supAt.temas[tema] ??= { retidos: 0, cancelados: 0 });
      tt.retidos += r;
      tt.cancelados += c;
    }
    if (tipoRetencao) tiposRetencaoPolo[tipoRetencao] += 1;

    const mAgg = marcasMap.get(marca) ?? resumoVazio();
    somar(mAgg, r, c);
    marcasMap.set(marca, mAgg);
    const uAgg = unidadesMap.get(unidadeSigla) ?? { ...resumoVazio(), detalhe: unidadeNome || undefined };
    somar(uAgg, r, c);
    unidadesMap.set(unidadeSigla, uAgg);

    const bucket =
      row.hora_bucket !== null && row.hora_bucket !== undefined ? bucketDe(row.hora_bucket) : null;
    (atendimentosPorOperador[prefixo] ??= []).push({
      horario: horarioDe(row.status_hora),
      hora: row.hora_bucket,
      bucket,
      bucketLabel: bucket !== null ? (LABEL_BUCKET.get(bucket) ?? null) : null,
      contrato: row.cod_air ?? "",
      cliente: row.comprador_nome ?? "",
      classe,
      tema,
      motivo,
      submotivo,
      status: row.status_retencao ?? "",
      argumento: cancelado ? null : (row.primeiro_nivel ?? "").trim() || null,
      tipoRetencao,
      marca,
      unidade: unidadeNome ? `${unidadeSigla} · ${unidadeNome}` : unidadeSigla,
    });

    let t = temasMap.get(tema);
    if (!t) {
      t = { ...resumoVazio(), canceladosManha: 0, canceladosTarde: 0, subs: new Map() };
      temasMap.set(tema, t);
    }
    somar(t, r, c);
    const turno = turnoDoOperador.get(prefixo);
    if (cancelado && turno === "manha") t.canceladosManha += 1;
    if (cancelado && turno === "tarde") t.canceladosTarde += 1;
    const sub = t.subs.get(submotivo) ?? { submotivo, retidos: 0, cancelados: 0 };
    sub.retidos += r;
    sub.cancelados += c;
    t.subs.set(submotivo, sub);

    if (row.hora_bucket !== null && row.hora_bucket !== undefined) {
      const h = horasMap.get(bucketDe(row.hora_bucket));
      if (h) {
        somar(h.total, r, c);
        const g = h.porGestor.get(gestorId) ?? resumoVazio();
        somar(g, r, c);
        h.porGestor.set(gestorId, g);
      }
    }
  }

  for (const lista of Object.values(atendimentosPorOperador)) {
    lista.sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));
  }

  const totalCancelamentos = [...temasMap.values()].reduce((acc, t) => acc + t.cancelados, 0);
  const temas: TemaPolo[] = [...temasMap.entries()]
    .map(([tema, t]) => ({
      tema,
      retidos: t.retidos,
      cancelados: t.cancelados,
      pedidos: t.pedidos,
      txRetencao: t.txRetencao,
      participacaoCancelamentos: totalCancelamentos > 0 ? t.cancelados / totalCancelamentos : 0,
      canceladosManha: t.canceladosManha,
      canceladosTarde: t.canceladosTarde,
      submotivos: [...t.subs.values()].sort((a, b) => b.cancelados - a.cancelados || b.retidos - a.retidos),
    }))
    .sort((a, b) => b.cancelados - a.cancelados || b.pedidos - a.pedidos);

  const acumulado = { retidos: 0, cancelados: 0 };
  const evolucao: HoraPolo[] = BUCKETS.map((b) => {
    const h = horasMap.get(b.hora)!;
    acumulado.retidos += h.total.retidos;
    acumulado.cancelados += h.total.cancelados;
    const pedidosAcum = acumulado.retidos + acumulado.cancelados;
    return {
      hora: b.hora,
      label: b.label,
      ...h.total,
      txAcumulada: pedidosAcum > 0 ? acumulado.retidos / pedidosAcum : null,
      supervisores: [...h.porGestor.entries()]
        .map(([gestorId, g]) => ({
          gestorId,
          retidos: g.retidos,
          cancelados: g.cancelados,
          impacto: impactoSemEquipe(h.total, g),
        }))
        .sort((a, b) => (b.impacto ?? -Infinity) - (a.impacto ?? -Infinity)),
    };
  });

  // Último report do dia = linha com o maior report_hora.
  const ultimoReport = linhas
    .filter((l) => l.report_hora)
    .sort((a, b) => (a.report_hora! < b.report_hora! ? -1 : 1))
    .at(-1);
  const reportHora = ultimoReport?.report_hora ?? null;
  const reportNomeSupervisor = await resolveNomeSupervisorReportExibicao(
    admin,
    ultimoReport?.report_nome_supervisor ?? null,
  );

  const marcas = paraRecortes(marcasMap).sort((a, b) => b.pedidos - a.pedidos);
  const todasUnidades = paraRecortes(unidadesMap);
  const unidades = [...todasUnidades]
    .sort((a, b) => b.cancelados - a.cancelados || b.pedidos - a.pedidos)
    .slice(0, 15);

  // Taxa por regional: TODAS as unidades agrupadas pelo estado (mapa de
  // uf-por-unidade.ts, o mesmo do /s); unidade não mapeada vai pra "Não
  // identificado" (nunca some do total). Taxa = retidos ÷ pedidos somados.
  const regionaisMap = new Map<string, RegionalTaxa>();
  for (const u of todasUnidades) {
    const uf = ufDaUnidade(u.detalhe ?? "", u.chave) ?? "—";
    const reg =
      regionaisMap.get(uf) ??
      { uf, nome: uf === "—" ? "Não identificado" : (NOME_ESTADO[uf] ?? uf), ...resumoVazio(), cidades: [] };
    somar(reg, u.retidos, u.cancelados);
    reg.cidades.push({ ...u, chave: u.detalhe ? formatNomeProprio(u.detalhe) : u.chave });
    regionaisMap.set(uf, reg);
  }
  const regionais = [...regionaisMap.values()].map((r) => ({
    ...r,
    cidades: r.cidades.sort((a, b) => b.pedidos - a.pedidos || b.cancelados - a.cancelados),
  }));
  const tentativas = polo.pedidos + totalAbortados;

  return {
    tiposRetencaoPolo,
    faceId: {
      abortados: totalAbortados,
      naoRealizado: totalFaceIdNaoRealizado,
      percentual: tentativas > 0 ? totalAbortados / tentativas : null,
      porStatus: [...abortadosPorStatus.entries()]
        .map(([status, quantidade]) => ({ status, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
      jornada: jornadaPolo,
    },
    marcas,
    unidades,
    regionais,
    polo,
    manha,
    tarde,
    supervisores,
    operadores,
    baixoRendimento,
    atendimentosPorOperador,
    temas,
    evolucao,
    reportHora,
    reportNomeSupervisor,
  };
}
