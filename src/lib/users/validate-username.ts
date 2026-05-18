/**
 * Valida formato de username: apenas letras minúsculas, números, ponto e hífen.
 */
export function isValidUsernameFormat(username: string): boolean {
  return (
    /^[a-z0-9.-]+$/.test(username) &&
    username.length >= 3 &&
    username.length <= 32
  );
}
