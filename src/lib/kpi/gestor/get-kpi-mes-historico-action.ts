"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";

import { getKpiEquipePorEmails } from "./get-kpi-equipe-gestor";
import { toKpiEquipeSerial, type KpiEquipeSerial } from "./serial-types";

const MES_REF_REGEX = /^\d{4}-\d{2}-01$/;

export type GetKpiMesHistoricoResult =
  | { success: true; data: KpiEquipeSerial }
  | { success: false; error: string };

/**
 * Busca os KPIs da equipe do gestor num mês histórico (fora dos 3 toggles
 * recentes pré-carregados na página) — chamada sob demanda ao clicar num
 * toggle de mês histórico em /kpi/operadores, pra não pagar 17 queries no
 * carregamento inicial da página.
 *
 * Mesma equipe (roster) e mesma resolução de nome fantasia dos 3 meses
 * recentes; tratado sempre como "neutro" (sem semáforo de meta), igual
 * mês passado/retrasado.
 */
export async function getKpiMesHistoricoAction(
  mesRef: string,
): Promise<GetKpiMesHistoricoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!MES_REF_REGEX.test(mesRef)) {
    return { success: false, error: "Mês inválido" };
  }

  const [emailsEquipe, definitions, nomeFantasiaConfig] = await Promise.all([
    getRosterOperadoresGestor(user.profile.id),
    getKpiDefinitions(),
    getNomeFantasiaConfig(user.profile.id),
  ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const raw = await getKpiEquipePorEmails(emailsEquipe, definitions, mesRef, true);
  const serial = toKpiEquipeSerial(raw, definitions);

  // Mesmo padrão de page.tsx (comNomeFantasia): acrescenta nomeExibicao sem
  // tocar em `nome` — mantém o histórico consistente com os 3 meses recentes.
  return {
    success: true,
    data: {
      ...serial,
      operadores: serial.operadores.map((op) => ({
        ...op,
        nomeExibicao: resolverNomeExibicao(op.email, nomeFantasia),
      })),
    },
  };
}
