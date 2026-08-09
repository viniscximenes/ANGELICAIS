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

/**
 * Converte qualquer email, login ou nome completo no formato "nome.sobrenome".
 * Ex: "Luciano Loureiro de Abreu" -> "luciano.abreu"
 * Ex: "MAYARA SILVA LIMA" -> "mayara.lima"
 * Ex: "SMTP:isack.gomes@alloha.com Ferreira Gom..." -> "isack.gomes"
 * Ex: "igor souza" -> "igor.souza"
 * Ex: "Vitória Narcizo Dos Santos" -> "vitoria.santos"
 */
export function formatNomeDotSobrenome(raw: string): string {
  if (!raw) return "";

  let cleaned = raw.trim().toLowerCase();

  // 1. Se contiver SMTP:, extrai o email limpo ou remove a tag
  if (cleaned.includes("smtp:")) {
    const match = cleaned.match(/smtp:([^\s@]+@[^\s@]+)/i);
    if (match) {
      cleaned = match[1];
    } else {
      cleaned = cleaned.replace(/smtp:/gi, "").trim();
    }
  }

  // 2. Se for um email (contém @), pega a parte antes do @
  if (cleaned.includes("@")) {
    cleaned = cleaned.split("@")[0].trim();
  }

  // Se já possui formato "nome.sobrenome"
  if (cleaned.includes(".")) {
    // Pega o primeiro token se houver sujeira/sobrenomes extras após o email
    return cleaned.split(/\s+/)[0].replace(/[^a-z0-9._-]/gi, "").toLowerCase();
  }

  // 3. Se for nome com espaços (ex: "luciano loureiro de abreu")
  const preposicoes = new Set(["de", "da", "do", "das", "dos", "e"]);
  const partes = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos para formato nome.sobrenome limpo
    .split(/\s+/)
    .filter((p) => p.length > 0 && !preposicoes.has(p));

  if (partes.length >= 2) {
    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    return `${primeiro}.${ultimo}`;
  }

  if (partes.length === 1) {
    return partes[0];
  }

  return cleaned;
}
