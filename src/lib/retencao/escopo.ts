import { getEmailVariants } from "@/lib/utils/email-variants";

export type EscopoFiltroParams = {
  escopo: "equipe" | "empresa";
  emailsEquipe: string[];
  periodo?: {
    horaInicio: number; // 0-23
    horaFim: number;   // 0-23
  } | null;
};

/**
 * Helper que aplica os filtros de escopo e período/hora a uma query do Supabase.
 * 
 * - EQUIPE: filtra por usuario_login IN (emailsEquipe).
 * - EMPRESA: sem filtro por operador.
 * - Período: se informado, filtra hora_bucket BETWEEN horaInicio AND horaFim.
 * 
 * @param query A query Supabase em progresso.
 * @param params Parâmetros do escopo/filtro selecionado.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aplicarFiltroEscopo(query: any, params: EscopoFiltroParams) {
  let q = query;

  if (params.escopo === "equipe") {
    if (params.emailsEquipe.length > 0) {
      // Operadores antigos podem aparecer com @sumicity.net.br nesta base
      // (importada de fora), mesmo que emailsEquipe venha em @alloha.com
      // (Sheets/profiles) — expande pra cobrir ambos os domínios.
      q = q.in("usuario_login", params.emailsEquipe.flatMap(getEmailVariants));
    } else {
      // Garante retorno vazio se a equipe do gestor estiver sem membros
      q = q.eq("usuario_login", "__sem_operadores_na_equipe__");
    }
  }

  if (params.periodo) {
    q = q.gte("hora_bucket", params.periodo.horaInicio)
         .lte("hora_bucket", params.periodo.horaFim);
  }

  return q;
}
