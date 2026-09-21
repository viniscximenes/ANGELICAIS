import { redirect } from "next/navigation";

/**
 * Conteúdo fundido em /reports/tempo-indisponibilidade (a própria página
 * agora inclui cards de resumo, tabela unificada e pausas detalhadas) —
 * mantida como redirect pra não quebrar links/favoritos antigos.
 */
export default function AnaliticoTempoIndisponibilidadeRedirect() {
  redirect("/reports/tempo-indisponibilidade");
}
