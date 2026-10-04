"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { createAdminClient } from "@/lib/supabase/admin";

type Resultado = { success: true; assinatura: string } | { success: false };

/**
 * "Assinatura" barata da base do dia (d1_consolidado de hoje): último
 * report_hora + quem subiu + quantidade de linhas. O /c compara a cada 30s
 * (mesmo intervalo do polling do /s) e, se mudou — um supervisor colou ou
 * limpou a base —, recarrega os dados da página sem F5. Só 2 consultas leves
 * (count + 1 linha), nada da busca pesada do consolidado.
 */
export async function assinaturaReportAction(): Promise<Resultado> {
  const user = await getCurrentUser();
  if (!user || !can(user.profile.role, "view_coordenador_panel")) return { success: false };

  const admin = createAdminClient();
  const dataRef = dataRefHojeBR();
  const [contagem, ultimo] = await Promise.all([
    admin.from("d1_consolidado").select("*", { count: "exact", head: true }).eq("data_ref", dataRef),
    admin
      .from("d1_consolidado")
      .select("report_hora, report_nome_supervisor")
      .eq("data_ref", dataRef)
      .not("report_hora", "is", null)
      .order("report_hora", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (contagem.error || ultimo.error) {
    console.error("[assinaturaReportAction] erro:", contagem.error?.message ?? ultimo.error?.message);
    return { success: false };
  }
  return {
    success: true,
    assinatura: `${ultimo.data?.report_hora ?? ""}|${ultimo.data?.report_nome_supervisor ?? ""}|${contagem.count ?? 0}`,
  };
}
