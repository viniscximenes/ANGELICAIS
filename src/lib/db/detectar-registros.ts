import { createAdminClient } from "@/lib/supabase/admin";

export type RegistroAtencao = {
  tipo: "pausa" | "tempo_logado";
  agent_user: string;
  agent_name: string;
  data_ref: string;
  reason_code: string | null;
  tempo_seg: number;
};

export type LinhaPausaDiario = {
  agent_user: string;
  agent_name: string;
  state: string;
  reason_code: string | null;
  login_time_seg: number | null;
  agent_state_time_seg: number | null;
};

// Reason codes reais confirmados no CSV fornecido (encoding já corrigido no
// parse). "Indisp." está na lista da regra mas não apareceu no CSV de
// exemplo — mantido para o caso de aparecer em outro dia.
export const REASON_CODES_PAUSA_1MIN = [
  "Monitoramento ou Tarefa",
  "Treinamento ou Reunião",
  "Feedback",
  "Pré Pausa",
  "Ativo",
  "Take Blip",
  "Pausa 15",
  "Pausa 40",
  "Operacional",
  "E-mail",
  "Indisp.",
  "System",
] as const;

const REASON_CODES_PAUSA_1MIN_LOWER = new Set(
  REASON_CODES_PAUSA_1MIN.map((r) => r.toLowerCase()),
);

const LIMIAR_PAUSA_1MIN_SEG = 60; // > 1 min
const LIMIAR_PAUSA_20_SEG = 25 * 60; // > 25 min
const LIMIAR_PAUSA_10_SEG = 25 * 60; // > 25 min
export const TEMPO_LOGADO_MINIMO_SEG = 6 * 3600 + 20 * 60; // 06:20:00 = 22800

// PostgREST/Supabase limita SELECTs a 1000 linhas por padrão quando não se
// passa .range() — um dia cheio de db_pausas_diario passa fácil disso.
// Usado só nas queries de leitura desse arquivo, não afeta as regras.
export const MAX_PAUSAS_ROWS = 50_000;

function normalizarReason(r: string | null): string {
  return (r ?? "").trim().toLowerCase();
}

/**
 * Aplica as 4 regras de detecção sobre as linhas de um único dia
 * (já agrupadas por agente internamente). Função pura — não toca no banco.
 */
export function aplicarRegrasDetecao(
  dataRef: string,
  linhas: LinhaPausaDiario[],
): RegistroAtencao[] {
  const porAgente = new Map<string, LinhaPausaDiario[]>();
  for (const linha of linhas) {
    const grupo = porAgente.get(linha.agent_user);
    if (grupo) {
      grupo.push(linha);
    } else {
      porAgente.set(linha.agent_user, [linha]);
    }
  }

  const registros: RegistroAtencao[] = [];

  for (const [agentUser, rows] of porAgente) {
    const agentName = rows[0].agent_name;

    let somaPausa20 = 0;
    let somaPausa10 = 0;
    let somaLogado = 0;

    for (const row of rows) {
      const reason = normalizarReason(row.reason_code);
      const tempo = row.agent_state_time_seg ?? 0;

      // Regra 1: pausas da lista, > 1 min, cada ocorrência é um registro.
      if (REASON_CODES_PAUSA_1MIN_LOWER.has(reason) && tempo > LIMIAR_PAUSA_1MIN_SEG) {
        registros.push({
          tipo: "pausa",
          agent_user: agentUser,
          agent_name: agentName,
          data_ref: dataRef,
          reason_code: row.reason_code,
          tempo_seg: tempo,
        });
      }

      if (reason === "pausa 20") {
        somaPausa20 += tempo;
      } else if (reason === "pausa 10") {
        somaPausa10 += tempo;
      }

      if (row.state.trim().toLowerCase() === "login") {
        somaLogado += row.login_time_seg ?? 0;
      }
    }

    // Regra 2: Pausa 20 somada > 25 min.
    if (somaPausa20 > LIMIAR_PAUSA_20_SEG) {
      registros.push({
        tipo: "pausa",
        agent_user: agentUser,
        agent_name: agentName,
        data_ref: dataRef,
        reason_code: "Pausa 20",
        tempo_seg: somaPausa20,
      });
    }

    // Regra 3: Pausa 10 somada > 25 min.
    if (somaPausa10 > LIMIAR_PAUSA_10_SEG) {
      registros.push({
        tipo: "pausa",
        agent_user: agentUser,
        agent_name: agentName,
        data_ref: dataRef,
        reason_code: "Pausa 10",
        tempo_seg: somaPausa10,
      });
    }

    // Regra 4: tempo logado total < 06:20:00.
    if (somaLogado < TEMPO_LOGADO_MINIMO_SEG) {
      registros.push({
        tipo: "tempo_logado",
        agent_user: agentUser,
        agent_name: agentName,
        data_ref: dataRef,
        reason_code: null,
        tempo_seg: somaLogado,
      });
    }
  }

  return registros;
}

/**
 * Lê as linhas do dia em db_pausas_diario e aplica as regras de detecção.
 */
export async function detectarRegistros(
  dataRef: string,
): Promise<RegistroAtencao[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("db_pausas_diario")
    .select(
      "agent_user, agent_name, state, reason_code, login_time_seg, agent_state_time_seg",
    )
    .eq("data_ref", dataRef)
    .range(0, MAX_PAUSAS_ROWS - 1);

  if (error) {
    throw new Error(
      `[detectar-registros] erro ao ler db_pausas_diario: ${error.message}`,
    );
  }

  return aplicarRegrasDetecao(dataRef, data ?? []);
}

export type ContagemPorDia = {
  dataRef: string;
  totalRegistros: number;
};

/**
 * Lê TODA a db_pausas_diario de uma vez (já é pequena — só linhas "Not
 * Ready"/"Login" retidas por 2 meses), agrupa por dia e roda as regras em
 * cada grupo. Evita 1 query por dia só pra popular o seletor de dia do
 * supervisor com "(X registros detectados)".
 */
export async function contarRegistrosPorDia(): Promise<ContagemPorDia[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("db_pausas_diario")
    .select(
      "data_ref, agent_user, agent_name, state, reason_code, login_time_seg, agent_state_time_seg",
    )
    .range(0, MAX_PAUSAS_ROWS - 1);

  if (error) {
    throw new Error(
      `[contar-registros-por-dia] erro ao ler db_pausas_diario: ${error.message}`,
    );
  }

  const porDia = new Map<string, LinhaPausaDiario[]>();
  for (const row of data ?? []) {
    const grupo = porDia.get(row.data_ref);
    if (grupo) {
      grupo.push(row);
    } else {
      porDia.set(row.data_ref, [row]);
    }
  }

  const resultado: ContagemPorDia[] = [];
  for (const [dataRef, linhas] of porDia) {
    resultado.push({
      dataRef,
      totalRegistros: aplicarRegrasDetecao(dataRef, linhas).length,
    });
  }

  return resultado.sort((a, b) => (a.dataRef < b.dataRef ? 1 : -1));
}
