import { createClient } from "@/lib/supabase/server";

import type { DiarioCaso, OperatorWithCount } from "./types";

/**
 * Lista todos os profiles (exceto GESTOR) com contagem de registros
 * de um mês específico.
 *
 * @param mesRef "YYYY-MM" (ex: "2026-05")
 */
export async function getOperatorsWithCounts(
  mesRef: string,
): Promise<OperatorWithCount[]> {
  const supabase = await createClient();

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, email_corporativo, role")
    .neq("role", "GESTOR")
    .eq("is_active", true)
    .order("full_name");

  if (profErr || !profiles) {
    console.error("[diario-operators-counts] erro profiles:", profErr);
    return [];
  }

  const [y, m] = mesRef.split("-").map(Number);
  const start = `${mesRef}-01`;
  const nextMonth =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = `${nextMonth}-01`;

  const { data: registros, error: regErr } = await supabase
    .from("diario_registros")
    .select("operator_email, caso")
    .gte("data_ocorrido", start)
    .lt("data_ocorrido", end);

  if (regErr) {
    console.error("[diario-operators-counts] erro registros:", regErr);
  }

  const countsByEmail = new Map<
    string,
    OperatorWithCount["countByCaso"] & { total: number }
  >();
  for (const r of registros ?? []) {
    const email = (r.operator_email as string).toLowerCase();
    const caso = r.caso as DiarioCaso;

    let entry = countsByEmail.get(email);
    if (!entry) {
      entry = {
        pausa_autorizada: 0,
        fora_jornada: 0,
        geral: 0,
        outros: 0,
        total: 0,
      };
      countsByEmail.set(email, entry);
    }

    entry[caso] += 1;
    entry.total += 1;
  }

  return profiles.map((p) => {
    const email = p.email_corporativo.toLowerCase();
    const counts = countsByEmail.get(email) ?? {
      pausa_autorizada: 0,
      fora_jornada: 0,
      geral: 0,
      outros: 0,
      total: 0,
    };

    return {
      id: p.id,
      fullName: p.full_name,
      emailCorporativo: p.email_corporativo,
      role: p.role,
      registrosCount: counts.total,
      countByCaso: {
        pausa_autorizada: counts.pausa_autorizada,
        fora_jornada: counts.fora_jornada,
        geral: counts.geral,
        outros: counts.outros,
      },
    };
  });
}
