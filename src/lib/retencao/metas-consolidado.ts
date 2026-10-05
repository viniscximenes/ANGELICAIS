/**
 * Metas usadas em /s/reports/consolidado.
 *
 * - Meta geral da taxa: vem de `gestor_config_fantasia.meta_tx_retencao`
 *   (mesma meta da EquipeTable), editada no "Configurações da Tabela".
 * - Metas por tema: ficam no localStorage (escopadas por gestorId, mesma
 *   chave de antes), também editadas no "Configurações da Tabela".
 *
 * As duas seções da página (GestorEquipeSection e RetencaoDetalheSection)
 * não compartilham estado React — o mesmo padrão de base-cleared-event.ts:
 * um evento de `window` avisa o Analítico quando as metas mudam.
 */

export const TEMAS_META = [
  "Mot. Financeiro",
  "Ins. Atendimento",
  "Ins. Serviço",
  "Mud. Endereço",
  "Mud. Provedora",
  "Outros",
] as const;

export const DEFAULT_THEME_METAS: Record<string, number> = {
  "Mot. Financeiro": 80,
  "Ins. Atendimento": 80,
  "Ins. Serviço": 80,
  "Mud. Endereço": 60,
  "Mud. Provedora": 60,
  "Outros": 60,
};

function chaveTemas(gestorId: string) {
  return `retencao_meta_temas_${gestorId}`;
}

export function lerThemeMetas(gestorId: string): Record<string, number> {
  try {
    const salvo = localStorage.getItem(chaveTemas(gestorId));
    if (!salvo) return { ...DEFAULT_THEME_METAS };
    return { ...DEFAULT_THEME_METAS, ...JSON.parse(salvo) };
  } catch {
    return { ...DEFAULT_THEME_METAS };
  }
}

export function salvarThemeMetas(gestorId: string, metas: Record<string, number>): void {
  try {
    localStorage.setItem(chaveTemas(gestorId), JSON.stringify(metas));
    // Meta geral antiga do Analítico (agora vem do banco) — limpa o resto.
    localStorage.removeItem(`retencao_meta_global_${gestorId}`);
  } catch {
    // Sem storage (aba privada etc.): a meta vale só nesta sessão.
  }
}

export type MetasConsolidado = {
  metaGlobal: number;
  themeMetas: Record<string, number>;
};

const METAS_EVENT = "consolidado-metas-atualizadas";

export function notifyMetasAtualizadas(metas: MetasConsolidado): void {
  window.dispatchEvent(new CustomEvent<MetasConsolidado>(METAS_EVENT, { detail: metas }));
}

export function onMetasAtualizadas(callback: (metas: MetasConsolidado) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<MetasConsolidado>).detail);
  window.addEventListener(METAS_EVENT, handler);
  return () => window.removeEventListener(METAS_EVENT, handler);
}
