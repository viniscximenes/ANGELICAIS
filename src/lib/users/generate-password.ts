/**
 * Gera senha aleatória de 12 caracteres alfanuméricos, sem caracteres ambíguos.
 * Evita: 0/O, 1/I/l, etc.
 */
export function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    for (let i = 0; i < 12; i++) {
      password += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return password;
}
