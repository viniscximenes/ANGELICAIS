import { createClient } from "@/lib/supabase/server";

type NomeFantasiaConfig = {
  ativo: boolean;
  mapa: Map<string, string>; // operador_email → nome_fantasia
  olhoConsolidado: boolean;
  /** Olho único da tabela unificada Tempo Logado & Indisponibilidade (dentro do Consolidado). */
  olhoTempoIndisponibilidade: boolean;
  olhoOperacional: boolean;
  olhoTma: boolean;
};

export async function getNomeFantasiaConfig(
  gestorId: string,
): Promise<NomeFantasiaConfig> {
  const supabase = await createClient();

  const [configResult, nomesResult] = await Promise.all([
    supabase
      .from("gestor_config_fantasia")
      .select(
        "ativo, olho_consolidado, olho_tempo_indisponibilidade, olho_operacional, olho_tma",
      )
      .eq("gestor_id", gestorId)
      .maybeSingle(),
    supabase
      .from("operador_nome_fantasia")
      .select("operador_email, nome_fantasia")
      .eq("gestor_id", gestorId),
  ]);

  if (configResult.error) {
    console.error("[getNomeFantasiaConfig] erro config:", configResult.error);
  }
  if (nomesResult.error) {
    console.error("[getNomeFantasiaConfig] erro nomes:", nomesResult.error);
  }

  const cfg = configResult.data as {
    ativo?: boolean;
    olho_consolidado?: boolean;
    olho_tempo_indisponibilidade?: boolean;
    olho_operacional?: boolean;
    olho_tma?: boolean;
  } | null;

  const mapa = new Map<string, string>();
  for (const row of (nomesResult.data ?? []) as {
    operador_email: string;
    nome_fantasia: string;
  }[]) {
    if (row.operador_email && row.nome_fantasia) {
      mapa.set(row.operador_email.toLowerCase(), row.nome_fantasia);
    }
  }

  return {
    ativo: cfg?.ativo ?? false,
    mapa,
    olhoConsolidado: cfg?.olho_consolidado ?? false,
    olhoTempoIndisponibilidade: cfg?.olho_tempo_indisponibilidade ?? false,
    olhoOperacional: cfg?.olho_operacional ?? false,
    olhoTma: cfg?.olho_tma ?? false,
  };
}
