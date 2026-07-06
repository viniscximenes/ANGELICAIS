import { resolveGuiaGestor } from "@/lib/google/gestor/resolve-guia-gestor";
import { listarOperadoresD1 } from "@/lib/google/gestor/operadores-d1/listar";

/**
 * Retorna os e-mails dos operadores da equipe do gestor.
 * Lê a coluna A das guias gerenciadas do gestor na planilha do Sheets
 * e retorna em formato minúsculo.
 * 
 * @param identificador O username ("nome.sobrenome") ou e-mail corporativo do gestor logado.
 */
export async function getEmailsEquipe(identificador: string): Promise<string[]> {
  const guiaPrincipal = resolveGuiaGestor(identificador);
  if (!guiaPrincipal) return [];

  try {
    const operadores = await listarOperadoresD1(guiaPrincipal);
    return operadores.map((op) => op.email.trim().toLowerCase());
  } catch (err) {
    console.error("[getEmailsEquipe] erro ao obter e-mails da equipe do gestor:", err);
    return [];
  }
}
