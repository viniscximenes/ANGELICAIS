import { revalidatePath } from "next/cache";

/**
 * Rotas que leem kpi_monthly_snapshots / kpi_gestor_snapshots.
 *
 * Chamar SEMPRE depois de qualquer escrita ou delete nessas duas tabelas
 * (upload de operador, upload de gestor, apagar mês). As páginas são
 * `force-dynamic`, então o render do servidor já é fresco; o revalidatePath
 * aqui é o que limpa o Router Cache do cliente — sem ele, navegar via
 * sidebar (soft nav) logo após a mutação ainda mostra o payload RSC antigo
 * até um hard refresh. `/bases/kpi` é estática, então pra ela é
 * obrigatório mesmo.
 */
const ROTAS_KPI = [
  "/bases/kpi",
  "/kpi/operadores",
  "/kpi/gestor",
  "/operacao/kpi-detalhado",
  "/operacao/analise-operadores",
  "/operacao/diario",
] as const;

export function revalidateKpiSnapshots(): void {
  for (const rota of ROTAS_KPI) {
    revalidatePath(rota);
  }
}
