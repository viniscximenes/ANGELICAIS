import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";

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
  return config.mapa[email] ?? fallback;
}
