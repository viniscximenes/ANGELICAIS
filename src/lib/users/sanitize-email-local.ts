const CORP_DOMAIN = "@alloha.com";

/**
 * Sanitiza a parte local do email corporativo.
 * Remove @alloha.com (caso o usuário tenha digitado o email completo)
 * e valida formato.
 *
 * Retorna o local sanitizado, ou null se inválido.
 */
export function sanitizeEmailLocal(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  const cleaned = trimmed.endsWith(CORP_DOMAIN)
    ? trimmed.slice(0, -CORP_DOMAIN.length)
    : trimmed;

  if (cleaned.includes("@") || cleaned.includes(" ")) return null;

  if (!/^[a-z0-9.-]+$/.test(cleaned)) return null;

  if (cleaned.length < 3 || cleaned.length > 64) return null;

  return cleaned;
}
