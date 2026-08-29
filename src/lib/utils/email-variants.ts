/**
 * Operadores antigos aparecem com domínios diferentes em bases diferentes
 * (a maioria em @alloha.com, alguns legados em @sumicity.net.br, mesma
 * pessoa). Sempre que uma query filtra dados por email de operador, deve
 * considerar as duas variantes.
 */
const DOMAIN_VARIANTS = ["@alloha.com", "@sumicity.net.br"];

/** Extrai a parte antes do @ (local-part), em minúsculas. */
export function getEmailPrefix(email: string): string {
  return email.trim().toLowerCase().split("@")[0];
}

/** Dado um email ou username, retorna todas as variantes de domínio possíveis. */
export function getEmailVariants(emailOrUsername: string): string[] {
  const prefix = getEmailPrefix(emailOrUsername);
  return DOMAIN_VARIANTS.map((domain) => `${prefix}${domain}`);
}
