"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import { getKpiEquipePorEmails } from "@/lib/kpi/gestor/get-kpi-equipe-gestor";

import { extractKpisExtras, type KpiExtrasPorEmail } from "./extract-kpis-extras";

const MES_REF_REGEX = /^\d{4}-\d{2}-01$/;

type GetKpiExtrasMesHistoricoResult =
  | { success: true; data: KpiExtrasPorEmail }
  | { success: false; error: string };

/**
 * Versão LOCAL (só desta rota) de getKpiMesHistoricoAction
 * (lib/kpi/gestor, compartilhado, NÃO alterado) — busca só os 3 KPIs
 * extras (tempo_projetado/tempo_login/multiplicador) de um mês histórico
 * mais antigo (fora dos 3 toggles recentes pré-carregados no server).
 *
 * getKpiMesHistoricoAction só retorna KpiEquipeSerial (já passado por
 * toKpiEquipeSerial, que descarta esses 3 slugs — SECUNDARIO_SLUGS_ORDER
 * não os lista), então o dado CRU (KpiEquipeGestorData) que
 * extractKpisExtras precisa nunca chega ao client por aquele caminho. Em
 * vez de alterar a action compartilhada, refazemos aqui a MESMA busca de
 * roster/definitions/KPIs (getRosterOperadoresGestor + getKpiDefinitions +
 * getKpiEquipePorEmails, todos compartilhados mas só CHAMADOS, não
 * alterados) e extraímos os 3 slugs extras do dado cru com a mesma função
 * usada em page.tsx pros 3 meses recentes.
 *
 * Chamada em paralelo com getKpiMesHistoricoAction ao clicar num toggle de
 * mês histórico distante (ver kpi-equipe-section.tsx) — mais uma query de
 * KPIs (isMesPassado=true, mesma equipe), aceitável pelo mesmo motivo que
 * o histórico já é "sob demanda": só roda quando o gestor pede aquele mês.
 */
export async function getKpiExtrasMesHistoricoAction(
  mesRef: string,
): Promise<GetKpiExtrasMesHistoricoResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  if (!MES_REF_REGEX.test(mesRef)) {
    return { success: false, error: "Mês inválido" };
  }

  const [emailsEquipe, definitions] = await Promise.all([
    getRosterOperadoresGestor(user.profile.id),
    getKpiDefinitions(),
  ]);

  const raw = await getKpiEquipePorEmails(emailsEquipe, definitions, mesRef, true);

  return { success: true, data: extractKpisExtras(raw) };
}
