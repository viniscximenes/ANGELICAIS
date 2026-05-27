import { getCurrentUser } from "@/lib/auth/get-current-user";
import { filterByUserEmail } from "@/lib/d1/filter-by-user";
import { getCurrentMonthSnapshot } from "@/lib/kpi/atual/get-current-month-snapshot";
import { getD1Data } from "@/lib/google/d1";

import type { PerformanceOperador } from "./types";

/**
 * Performance do operador no /atendimento — dois recortes:
 *
 * KPI até ontem (oficial): valores fechados do mês corrente vindos da
 * planilha KPI Atual (slugs `pedidos` e `churn`). Retidos é derivado como
 * `pedidos - churn`. TX = retidos / pedidos.
 *
 * Estimativa do dia (KPI até ontem + D-1 hoje): soma os números do KPI
 * oficial com o que o D-1 do operador já registrou no dia em curso.
 * `txRetencao` do D-1 vem em FRAÇÃO (0-1), mas como recalculamos a TX a
 * partir de retidos/pedidos somados, isso é irrelevante aqui.
 *
 * `getCurrentMonthSnapshot` resolve o alias `email_corporativo_alias_kpi`
 * internamente via `resolveKpiEmailForProfile`, então passamos o email
 * corporativo cru.
 */
export async function getPerformanceOperador(): Promise<PerformanceOperador | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const email = user.profile.emailCorporativo;

    const [d1Data, kpiAtual] = await Promise.all([
      getD1Data(),
      getCurrentMonthSnapshot(email),
    ]);

    const operador = filterByUserEmail(d1Data, email).operador;

    const kpiPedidos = kpiAtual.kpis.get("pedidos")?.valor ?? 0;
    const kpiCancelados = kpiAtual.kpis.get("churn")?.valor ?? 0;
    const kpiRetidos = Math.max(kpiPedidos - kpiCancelados, 0);
    const kpiTx = kpiPedidos > 0 ? (kpiRetidos / kpiPedidos) * 100 : 0;

    const hojeRetidos = operador?.retidos ?? 0;
    const hojeCancelados = operador?.cancelados ?? 0;
    const hojePedidos = operador?.pedidos ?? 0;

    const estimativaRetidos = kpiRetidos + hojeRetidos;
    const estimativaCancelados = kpiCancelados + hojeCancelados;
    const estimativaPedidos = kpiPedidos + hojePedidos;
    const estimativaTx =
      estimativaPedidos > 0
        ? (estimativaRetidos / estimativaPedidos) * 100
        : 0;

    return {
      kpiAteOntemRetidos: kpiRetidos,
      kpiAteOntemCancelados: kpiCancelados,
      kpiAteOntemPedidos: kpiPedidos,
      kpiAteOntemTx: kpiTx,
      estimativaRetidos,
      estimativaCancelados,
      estimativaPedidos,
      estimativaTx,
    };
  } catch (e) {
    console.error("[get-performance-operador] erro:", e);
    return null;
  }
}
