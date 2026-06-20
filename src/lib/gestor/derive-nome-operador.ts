/**
 * Helpers de exibição de nome para o Painel do Gestor.
 *
 * A coluna A da guia do gestor guarda o EMAIL do operador (ex.:
 * "willian.souza@alloha.com"). Para a UI, derivamos um nome legível.
 */

/** Title-case de um texto já separado por espaços (ex.: nome completo). */
export function formatNomeProprio(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Deriva o nome de exibição a partir do email do operador.
 *   "willian.souza@alloha.com" → "Willian Souza"
 * Pega a parte local (antes do @), quebra por . _ - e capitaliza cada parte.
 * Se não houver parte local, devolve o valor original.
 */
export function deriveNomeOperador(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.toLowerCase().trim() || email;
}
