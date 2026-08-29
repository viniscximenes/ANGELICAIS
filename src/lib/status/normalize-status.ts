/**
 * Normalização de status do operador (meta_status do snapshot): lowercase,
 * sem acento, sem espaços nas pontas. "Férias" -> "ferias", "Ativo" -> "ativo".
 *
 * Fonte única — usada pelo cálculo de RV e pela Evolução. Mantém a convenção
 * de que status vazio/null vira "" (tratado como ativo).
 */
export function normalizeStatus(s: string | null): string {
  if (!s) return "";
  const normalized = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  if (normalized === "ativo - treinamento" || normalized === "ativo-treinamento") {
    return "ativo";
  }
  return normalized;
}
