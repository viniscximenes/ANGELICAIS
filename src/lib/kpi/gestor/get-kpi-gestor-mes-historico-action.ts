"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";

import { buildKpiGestorCards, type KpiGestorCardSerial } from "./build-kpi-gestor-cards";
import { getDefasadosGestorPorKpi, type DefasadoGestorInfo } from "./get-defasados-gestor-por-kpi";
import { getKpiGestorMetas } from "./get-kpi-gestor-metas";
import { getKpiGestorProprio } from "./get-kpi-gestor-proprio";

const MES_REF_REGEX = /^\d{4}-\d{2}-01$/;

export type KpiGestorMesData = {
  mesRef: string;
  dataCorte: string | null;
  hasData: boolean;
  cards: KpiGestorCardSerial[];
  defasados: Record<string, DefasadoGestorInfo>;
};

export type GetKpiGestorMesHistoricoResult =
  | { success: true; data: KpiGestorMesData }
  | { success: false; error: string };

/**
 * Busca os KPIs do gestor + defasados da equipe num mês histórico de
 * /kpi/gestor — chamada sob demanda ao clicar num toggle de mês fora dos 3
 * recentes pré-carregados na página.
 */
export async function getKpiGestorMesHistoricoAction(
  mesRef: string,
): Promise<GetKpiGestorMesHistoricoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }
  if (!MES_REF_REGEX.test(mesRef)) {
    return { success: false, error: "Mês inválido" };
  }

  const metas = await getKpiGestorMetas(user.profile.id);

  const [proprio, defasados] = await Promise.all([
    getKpiGestorProprio(user.profile.fullName, mesRef),
    getDefasadosGestorPorKpi(user.profile.id, mesRef, metas),
  ]);

  return {
    success: true,
    data: {
      mesRef: proprio.mesRef,
      dataCorte: proprio.dataCorte,
      hasData: proprio.hasData,
      cards: buildKpiGestorCards(proprio.valuesBySlug, metas),
      defasados,
    },
  };
}
