import { createClient } from "@/lib/supabase/server";

export type NomeFantasiaConfig = {
  ativo: boolean;
  mapa: Map<string, string>; // operador_email → nome_fantasia
};

export async function getNomeFantasiaConfig(
  gestorId: string,
): Promise<NomeFantasiaConfig> {
  const supabase = await createClient();

  const [configResult, nomesResult] = await Promise.all([
    supabase
      .from("gestor_config_fantasia")
      .select("ativo")
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

  const ativo = (configResult.data as { ativo?: boolean } | null)?.ativo ?? false;

  const mapa = new Map<string, string>();
  for (const row of (nomesResult.data ?? []) as {
    operador_email: string;
    nome_fantasia: string;
  }[]) {
    if (row.operador_email && row.nome_fantasia) {
      mapa.set(row.operador_email.toLowerCase(), row.nome_fantasia);
    }
  }

  return { ativo, mapa };
}
