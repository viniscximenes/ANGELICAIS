import { createClient } from "@/lib/supabase/server";

type NomeFantasiaConfig = {
  ativo: boolean;
  mapa: Map<string, string>; // operador_email → nome_fantasia
  olhoConsolidado: boolean;
  olhoTempoLogado: boolean;
  olhoIndisponibilidade: boolean;
  olhoOperacional: boolean;
};

export async function getNomeFantasiaConfig(
  gestorId: string,
): Promise<NomeFantasiaConfig> {
  const supabase = await createClient();

  const [configResult, nomesResult] = await Promise.all([
    supabase
      .from("gestor_config_fantasia")
      .select(
        "ativo, olho_consolidado, olho_tempo_logado, olho_indisponibilidade, olho_operacional",
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
    olho_tempo_logado?: boolean;
    olho_indisponibilidade?: boolean;
    olho_operacional?: boolean;
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
    olhoTempoLogado: cfg?.olho_tempo_logado ?? false,
    olhoIndisponibilidade: cfg?.olho_indisponibilidade ?? false,
    olhoOperacional: cfg?.olho_operacional ?? false,
  };
}
