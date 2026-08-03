import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { getRosterOperadoresGestor } from "./get-roster-gestor";
import { dataRefHojeBR, horaParaSegundos } from "./parse";
import {
  META_TEMPO_LOGADO_SEGUNDOS,
  type GestorTempoLogadoData,
  type GestorTempoLogadoLinha,
  type StatusPresenca,
} from "./types";

function statusDe(horaLogin: string | null, horaLogout: string | null): StatusPresenca {
  if (!horaLogin) return "ausente";
  if (!horaLogout) return "ainda_logado";
  return "completo";
}

/**
 * Lê o Tempo Logado da equipe de um gestor (d1_tempo_logado, data de
 * hoje). Substitui fetchGestorTempoLogado (Sheets) — mesmo shape de
 * retorno (GestorTempoLogadoData).
 *
 * A lista de operadores vem SEMPRE do roster (d1_operadores_gestor) — um
 * operador cadastrado mas sem upload de hoje aparece como "ausente" (zero
 * segundos, sem login). Só retorna `operadores: []` quando o roster está
 * vazio (equipe sem ninguém cadastrado).
 */
export async function getGestorTempoLogado(gestorId: string): Promise<GestorTempoLogadoData> {
  const admin = createAdminClient();

  const [roster, { data, error }, { data: gestorProfile }] = await Promise.all([
    getRosterOperadoresGestor(gestorId),
    admin
      .from("d1_tempo_logado")
      .select(
        "operator_email, tempo_logado, logout_estimado, hora_login, hora_logout, report_hora, report_nome_supervisor",
      )
      .eq("gestor_id", gestorId)
      .eq("data_ref", dataRefHojeBR()),
    admin.from("profiles").select("full_name").eq("id", gestorId).maybeSingle(),
  ]);

  if (roster.length === 0) return { operadores: [] };

  if (error) {
    console.error("[get-gestor-tempo-logado] erro ao buscar d1_tempo_logado:", error.message);
  }

  const rows = data ?? [];
  const nomeGestor = gestorProfile?.full_name ?? "";
  // Chave por PREFIXO — mesma pessoa pode vir @alloha.com ou
  // @sumicity.net.br no CSV; o roster só guarda @alloha.com.
  const rowPorPrefixo = new Map(rows.map((row) => [getEmailPrefix(row.operator_email), row]));

  const operadores: GestorTempoLogadoLinha[] = roster.map((email) => {
    const row = rowPorPrefixo.get(getEmailPrefix(email));
    if (!row) {
      return {
        email,
        gestor: nomeGestor,
        tempoLogado: "00:00:00",
        tempoLogadoSegundos: 0,
        cumpriuMeta: false,
        logoutEstimado: "—",
        horaLogin: null,
        horaLogout: null,
        status: statusDe(null, null),
      };
    }
    const tempoLogadoSegundos = horaParaSegundos(row.tempo_logado);
    return {
      // Email canônico do roster — mantém a identidade estável entre
      // uploads mesmo se o CSV variar de domínio.
      email,
      gestor: nomeGestor,
      tempoLogado: row.tempo_logado ?? "00:00:00",
      tempoLogadoSegundos,
      cumpriuMeta: tempoLogadoSegundos >= META_TEMPO_LOGADO_SEGUNDOS,
      logoutEstimado: row.logout_estimado ?? "—",
      horaLogin: row.hora_login,
      horaLogout: row.hora_logout,
      status: statusDe(row.hora_login, row.hora_logout),
    };
  });

  return {
    operadores,
    horaReport: rows[0]?.report_hora ?? undefined,
    nomeSupervisorReport: rows[0]?.report_nome_supervisor ?? null,
  };
}
