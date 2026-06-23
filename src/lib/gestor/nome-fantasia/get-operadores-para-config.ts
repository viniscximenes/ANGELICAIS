import { fetchGestorData, resolveGuiaGestor } from "@/lib/google/gestor";

export type OperadorParaConfig = {
  email: string;
  nomeReal: string;
};

function emailToNomeReal(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Retorna a lista de operadores da equipe do gestor a partir da planilha do D-1.
 * Usa os mesmos emails que alimentam as tabelas do painel do gestor.
 */
export async function getOperadoresParaConfig(
  username: string,
  emailCorporativo: string,
): Promise<OperadorParaConfig[]> {
  const guia =
    resolveGuiaGestor(username) ?? resolveGuiaGestor(emailCorporativo);

  if (!guia) return [];

  const data = await fetchGestorData(guia);

  return data.operadores
    .filter((op) => op.nome.trim())
    .map((op) => {
      const email = op.nome.trim().toLowerCase();
      return { email, nomeReal: emailToNomeReal(email) };
    });
}
