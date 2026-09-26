import type { createAdminClient } from "@/lib/supabase/admin";
import { formatNomeDotSobrenome, formatNomeProprio } from "./derive-nome-operador";

/**
 * Formata o nome do supervisor exibido no subtítulo "{nome} fez um report às
 * {hora}" (/reports/tempo-indisponibilidade e /reports/consolidado).
 *
 * O dado bruto (`d1_tempo_logado.report_nome_supervisor` / mesma coluna em
 * d1_consolidado) é gravado, no upload, a partir de `profiles.full_name` —
 * campo inconsistente (algumas linhas em CAIXA ALTA, outras em Title Case) e
 * às vezes com nome completo (com nomes do meio). Não há coluna de "nome de
 * exibição" em `profiles`, mas `username` segue sempre o padrão
 * "nome.sobrenome" (ex.: "gabriel.ximenes"), então resolvemos o profile cujo
 * full_name bate com o texto bruto (case-insensitive) e derivamos o nome de
 * exibição a partir do username dele — só formatação, nenhum dado é
 * alterado no banco.
 *
 * Fallback (sem profile correspondente — nome bruto não bate com nenhum
 * full_name gravado hoje, ex.: dado legado/digitado diferente): deriva um
 * "nome.sobrenome" aproximado direto do texto bruto (primeiro + último nome,
 * ignorando preposições) e aplica a mesma formatação de iniciais maiúsculas.
 * Pode não bater 100% com o username real quando há nomes do meio, mas
 * mantém o padrão visual "Nome Sobrenome".
 */
export async function resolveNomeSupervisorReportExibicao(
  admin: ReturnType<typeof createAdminClient>,
  nomeReportBruto: string | null | undefined,
): Promise<string | null> {
  const nomeBruto = nomeReportBruto?.trim();
  if (!nomeBruto) return null;

  const { data: profileMatch } = await admin
    .from("profiles")
    .select("username")
    .ilike("full_name", nomeBruto)
    .maybeSingle();

  const username = profileMatch?.username?.trim();
  if (username) {
    return formatNomeProprio(username.replace(/[._-]+/g, " "));
  }

  const dotFormat = formatNomeDotSobrenome(nomeBruto);
  if (dotFormat) {
    return formatNomeProprio(dotFormat.replace(/[._-]+/g, " "));
  }
  return formatNomeProprio(nomeBruto);
}
