import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { getEmailVariants } from "@/lib/utils/email-variants";

export type NomeFantasiaSerial = {
  ativo: boolean;
  mapa: Record<string, string>;
};

export function resolverNomeExibicao(
  email: string,
  config: NomeFantasiaSerial,
): string {
  const fallback = deriveNomeOperador(email);
  if (!config.ativo) return fallback;
  if (config.mapa[email]) return config.mapa[email];

  // O gestor sempre cadastra o apelido em @alloha.com, mas o email vindo do
  // D-1 (Google Sheets) pode ser de um domínio legado (@sumicity.net.br) —
  // tenta as variantes antes de cair no nome derivado.
  for (const variante of getEmailVariants(email)) {
    if (config.mapa[variante]) return config.mapa[variante];
  }

  return fallback;
}
