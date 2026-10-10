"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { metaTmaValida } from "@/lib/tma/tma-status-pure";

import { isOrdemTabelaTma, type OrdemTabelaTma } from "../types";

type SaveConfigTabelaTmaResult = { success: true } | { success: false; error: string };

/**
 * Salva as "Configurações da Tabela" do TMA — meta e ordenação — numa
 * gravação só, mesmo padrão do saveConfigTabelaAction do Consolidado (gate
 * GESTOR, validação no servidor, uma gravação). Antes eram duas actions em
 * paralelo (saveTmaMetaAction + esta): se uma falhava, a outra ficava
 * gravada e a tela não refletia nenhuma das duas.
 *
 * Meta: override em kpi_gestor_metas.tma (MM:SS, direção lower_better) — o
 * MESMO campo lido pelo KPI mensal (/kpi/gestor). `null` remove o override e
 * volta a valer a meta padrão do KPI (kpi_definitions). Ordenação: coluna
 * própria (ordem_tabela_tma).
 *
 * Grava pela função salvar_config_tabela_tma (scripts/sql/
 * salvar-config-tabela-tma.sql), que troca SÓ a chave "tma" de
 * kpi_gestor_metas sobre o valor atual, num UPDATE que trava a linha. Antes
 * a action lia o JSON, trocava a chave aqui e regravava tudo: uma gravação
 * de outra tela no meio (ex.: metas do /s/kpi/gestor) era sobrescrita.
 * Roda com o cliente do usuário (SECURITY INVOKER + auth.uid()), sob as
 * mesmas policies "own" da tabela.
 *
 * RISCO-ACEITO: salvar as metas no /s/kpi/gestor com a tela aberta desde antes pode desfazer a meta do TMA salva aqui.
 * Motivo: saveKpiGestorMetasAction (src/lib/kpi/gestor/save-kpi-gestor-metas-action.ts) ainda regrava o kpi_gestor_metas INTEIRO, inclusive "tma"; o ajuste daquela rota ficou para a auditoria dela (decisão do usuário, 2026-10-10).
 * Mitigação: deste lado o merge já é atômico (só a chave "tma"); o cenário exige as duas telas abertas e salvas em sequência.
 * Revisar quando: a auditoria do /s/kpi/gestor fizer aquela action gravar só as chaves alteradas (merge no banco, como salvar_config_tabela_tma).
 */
export async function saveConfigTabelaTmaAction(
  metaMmSs: string | null,
  ordemTabela: OrdemTabelaTma,
): Promise<SaveConfigTabelaTmaResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  // Server Action é um endpoint público: o tipo do TS não chega em runtime.
  if (metaMmSs !== null && (typeof metaMmSs !== "string" || !metaTmaValida(metaMmSs))) {
    return { success: false, error: "Meta inválida — use MM:SS, segundos de 00 a 59, maior que 00:00" };
  }

  if (typeof ordemTabela !== "string" || !isOrdemTabelaTma(ordemTabela)) {
    return { success: false, error: "Ordenação inválida." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("salvar_config_tabela_tma", {
    p_meta: metaMmSs === null ? null : metaMmSs.trim(),
    p_ordem: ordemTabela,
  });

  if (error) {
    console.error("[saveConfigTabelaTmaAction] erro:", error.message);
    return { success: false, error: "Erro ao salvar configuração." };
  }

  // Sem revalidatePath (mesmo do saveConfigTabelaAction do Consolidado): o
  // popover aplica meta/ordem na tela (onSaved → refetch da tabela, e a meta
  // nova muda a versão da base e recarrega o Analítico). Revalidar refazia a
  // página inteira dentro da resposta.
  return { success: true };
}
