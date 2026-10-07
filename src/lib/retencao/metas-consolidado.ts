/**
 * Metas usadas em /s/reports/consolidado.
 *
 * - Meta geral da taxa: vem de `gestor_config_fantasia.meta_tx_retencao`
 *   (mesma meta da EquipeTable), editada no "Configurações da Tabela".
 * - Metas por tema: `gestor_config_fantasia.meta_temas` (jsonb), salvas
 *   junto com a meta geral no "Configurações da Tabela". Antes ficavam só no
 *   localStorage — não acompanhavam o gestor em outro navegador. O
 *   localStorage agora é só leitura de TRANSIÇÃO: enquanto meta_temas for
 *   null (nunca salvou no banco), vale o que estava no navegador, e o
 *   próximo "Salvar" grava no banco e limpa a chave local.
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

function metaValida(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

/**
 * Valida o objeto vindo do cliente (Server Action é endpoint público): exige
 * TODOS os temas, cada um entre 0 e 100. null = inválido.
 */
export function validarThemeMetas(valor: unknown): Record<string, number> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const entrada = valor as Record<string, unknown>;
  const metas: Record<string, number> = {};
  for (const tema of TEMAS_META) {
    const v = entrada[tema];
    if (!metaValida(v)) return null;
    metas[tema] = v;
  }
  return metas;
}

/**
 * meta_temas do banco → metas completas (padrão para tema ausente/inválido).
 * null = coluna vazia (nunca salvou): a tela usa a leitura de transição.
 */
export function themeMetasDoBanco(valor: unknown): Record<string, number> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const entrada = valor as Record<string, unknown>;
  const metas = { ...DEFAULT_THEME_METAS };
  for (const tema of TEMAS_META) {
    if (metaValida(entrada[tema])) metas[tema] = entrada[tema] as number;
  }
  return metas;
}

/** Transição: metas que o gestor tinha salvo só no navegador (antes do banco). */
export function lerThemeMetasLegado(gestorId: string): Record<string, number> {
  try {
    const salvo = localStorage.getItem(chaveTemas(gestorId));
    if (!salvo) return { ...DEFAULT_THEME_METAS };
    return themeMetasDoBanco(JSON.parse(salvo)) ?? { ...DEFAULT_THEME_METAS };
  } catch {
    return { ...DEFAULT_THEME_METAS };
  }
}

/** Depois de gravar no banco: a cópia local deixa de valer. */
export function limparThemeMetasLegado(gestorId: string): void {
  try {
    localStorage.removeItem(chaveTemas(gestorId));
    // Meta geral antiga do Analítico (já vem do banco há tempo).
    localStorage.removeItem(`retencao_meta_global_${gestorId}`);
  } catch {
    // Sem storage (aba privada etc.): nada a limpar.
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
