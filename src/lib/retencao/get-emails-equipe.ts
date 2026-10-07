import { getRosterOperadoresGestorOuErro } from "@/lib/d1-db/get-roster-gestor";

/**
 * Retorna os e-mails dos operadores da equipe do gestor (d1_operadores_gestor).
 *
 * Recebe o `gestorId` (profiles.id) diretamente — resolvido pelo chamador a
 * partir de `user.profile.id` (sessão já autenticada). Não re-resolve por
 * username/e-mail (ver `resolveGestorId`, deixado de ser usado aqui na fusão
 * de /s/reports/consolidado com /s/reports/consolidado/analitico).
 *
 * Mesma leitura do topo da página (getRosterOperadoresGestorOuErro): mesma
 * normalização e ordem. Erro de banco LANÇA (não devolve []): lista vazia é
 * "equipe sem ninguém" e faria o Analítico responder sucesso com tudo zerado
 * ("Aguardando dados") quando na verdade a consulta falhou. Os chamadores
 * (actions.ts) já tratam a exceção como erro.
 */
export async function getEmailsEquipe(gestorId: string): Promise<string[]> {
  if (!gestorId) return [];
  return getRosterOperadoresGestorOuErro(gestorId);
}
