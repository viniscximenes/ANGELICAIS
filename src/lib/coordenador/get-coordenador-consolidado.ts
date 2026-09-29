import { createAdminClient } from "@/lib/supabase/admin";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { resolveNomeSupervisorReportExibicao } from "@/lib/gestor/resolve-nome-supervisor-report";
import { getEmailPrefix } from "@/lib/utils/email-variants";

export type Turno = "manha" | "tarde";

export type ResumoTaxa = {
  retidos: number;
  cancelados: number;
  pedidos: number;
  /** Fração 0–1; null quando não há pedidos. */
  txRetencao: number | null;
};

export type SupervisorLinha = ResumoTaxa & {
  gestorId: string;
  nome: string;
  turno: Turno | null;
  operadores: number;
  /** Operadores com pedidos e taxa abaixo da meta. */
  abaixoDaMeta: number;
};

export type OperadorBaixoRendimento = ResumoTaxa & {
  email: string;
  supervisor: string;
  turno: Turno | null;
};

export type CoordenadorConsolidado = {
  polo: ResumoTaxa;
  manha: ResumoTaxa;
  tarde: ResumoTaxa;
  supervisores: SupervisorLinha[];
  baixoRendimento: OperadorBaixoRendimento[];
  reportHora: string | null;
  /** Quem fez o último report (upload da base), já formatado pra exibição. */
  reportNomeSupervisor: string | null;
};

/** Login antes das 14:00 = manhã; a partir das 14:00 = tarde. */
const HORA_CORTE_TURNO = 14;

/** Mínimo de pedidos pra entrar na lista de baixo rendimento — evita taxa de 0/1 pedido. */
export const MIN_PEDIDOS_BAIXO_RENDIMENTO = 3;

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
 * Visão do polo inteiro pro COORDENADOR (d1_consolidado + d1_tempo_logado do
 * dia). Diferente de getGestorConsolidado, não parte do roster de UM gestor:
 * lê todas as linhas do dia e agrupa por supervisor (roster em
 * d1_operadores_gestor → gestor_id da própria linha como fallback).
 *
 * Turno: pelo horário de login do operador (d1_tempo_logado). Quem não tem
 * login registrado herda o turno majoritário da equipe do supervisor.
 *
 * @param metaTx Meta de taxa de retenção em % (0–100).
 */
export async function getCoordenadorConsolidado(metaTx: number): Promise<CoordenadorConsolidado> {
  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();

  const [consolidadoRes, tempoRes, rosterRes, gestoresRes] = await Promise.all([
    admin
      .from("d1_consolidado")
      .select("operator_email, gestor_id, retidos, cancelados, report_hora, report_nome_supervisor")
      .eq("data_ref", dataRef),
    admin.from("d1_tempo_logado").select("operator_email, hora_login").eq("data_ref", dataRef),
    admin.from("d1_operadores_gestor").select("gestor_id, operador_email"),
    admin.from("profiles").select("id, full_name").eq("role", "GESTOR").eq("is_active", true),
  ]);

  if (consolidadoRes.error) {
    console.error("[get-coordenador-consolidado] d1_consolidado:", consolidadoRes.error.message);
  }

  const linhas = consolidadoRes.data ?? [];
  const metaFracao = metaTx / 100;

  const turnoPorPrefixo = new Map<string, Turno | null>();
  for (const row of tempoRes.data ?? []) {
    turnoPorPrefixo.set(getEmailPrefix(row.operator_email), turnoPorHora(row.hora_login));
  }

  const gestorPorPrefixo = new Map<string, string>();
  for (const row of rosterRes.data ?? []) {
    const prefixo = getEmailPrefix(row.operador_email);
    if (!gestorPorPrefixo.has(prefixo)) gestorPorPrefixo.set(prefixo, row.gestor_id);
  }

  const nomeGestor = new Map<string, string>(
    (gestoresRes.data ?? []).map((g) => [g.id, formatNomeProprio(g.full_name ?? "")]),
  );

  type OperadorDia = {
    email: string;
    gestorId: string | null;
    retidos: number;
    cancelados: number;
    turno: Turno | null;
  };

  const operadores: OperadorDia[] = linhas.map((row) => {
    const prefixo = getEmailPrefix(row.operator_email);
    return {
      email: row.operator_email.trim().toLowerCase(),
      gestorId: gestorPorPrefixo.get(prefixo) ?? row.gestor_id ?? null,
      retidos: row.retidos ?? 0,
      cancelados: row.cancelados ?? 0,
      turno: turnoPorPrefixo.get(prefixo) ?? null,
    };
  });

  // Turno majoritário por supervisor — usado pro próprio supervisor e pra
  // operadores sem login registrado.
  const contagemTurno = new Map<string, { manha: number; tarde: number }>();
  for (const op of operadores) {
    if (!op.gestorId || !op.turno) continue;
    const c = contagemTurno.get(op.gestorId) ?? { manha: 0, tarde: 0 };
    c[op.turno] += 1;
    contagemTurno.set(op.gestorId, c);
  }
  const turnoDoGestor = (gestorId: string | null): Turno | null => {
    const c = gestorId ? contagemTurno.get(gestorId) : undefined;
    if (!c) return null;
    return c.manha >= c.tarde ? "manha" : "tarde";
  };

  const polo = resumoVazio();
  const manha = resumoVazio();
  const tarde = resumoVazio();
  const porGestor = new Map<string, SupervisorLinha>();
  const baixoRendimento: OperadorBaixoRendimento[] = [];

  for (const op of operadores) {
    const turno = op.turno ?? turnoDoGestor(op.gestorId);
    somar(polo, op.retidos, op.cancelados);
    if (turno === "manha") somar(manha, op.retidos, op.cancelados);
    if (turno === "tarde") somar(tarde, op.retidos, op.cancelados);

    const pedidos = op.retidos + op.cancelados;
    const tx = pedidos > 0 ? op.retidos / pedidos : null;
    const abaixo = tx !== null && tx < metaFracao;
    const chaveGestor = op.gestorId ?? "sem-supervisor";
    const nomeSupervisor = (op.gestorId && nomeGestor.get(op.gestorId)) || "Sem supervisor";

    let sup = porGestor.get(chaveGestor);
    if (!sup) {
      sup = {
        gestorId: chaveGestor,
        nome: nomeSupervisor,
        turno: turnoDoGestor(op.gestorId),
        operadores: 0,
        abaixoDaMeta: 0,
        ...resumoVazio(),
      };
      porGestor.set(chaveGestor, sup);
    }
    sup.operadores += 1;
    if (abaixo) sup.abaixoDaMeta += 1;
    somar(sup, op.retidos, op.cancelados);

    if (abaixo && pedidos >= MIN_PEDIDOS_BAIXO_RENDIMENTO) {
      baixoRendimento.push({
        email: op.email,
        supervisor: nomeSupervisor,
        turno,
        retidos: op.retidos,
        cancelados: op.cancelados,
        pedidos,
        txRetencao: tx,
      });
    }
  }

  const ordemTurno = (t: Turno | null) => (t === "manha" ? 0 : t === "tarde" ? 1 : 2);
  const supervisores = [...porGestor.values()].sort(
    (a, b) =>
      ordemTurno(a.turno) - ordemTurno(b.turno) ||
      (a.txRetencao ?? -1) - (b.txRetencao ?? -1),
  );

  // Pior primeiro; empate de taxa → quem tem mais pedidos (maior impacto).
  baixoRendimento.sort(
    (a, b) => (a.txRetencao ?? 0) - (b.txRetencao ?? 0) || b.pedidos - a.pedidos,
  );

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

  return { polo, manha, tarde, supervisores, baixoRendimento, reportHora, reportNomeSupervisor };
}
