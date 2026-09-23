import { resolveKpiEmailCandidatesForProfiles } from "@/lib/profile/get-kpi-email-for-profile";
import { createClient } from "@/lib/supabase/server";

export interface KpiAnteriorCelula {
  valor: number;
  dataCorte: string;
}

/** email (lowercase, o mesmo do roster) → célula anterior de tx_retencao_bruta. */
export type KpiAnteriorPorOperador = Record<string, KpiAnteriorCelula>;

export interface KpiAnteriorEquipe {
  porOperador: KpiAnteriorPorOperador;
  /** data_corte mais frequente entre as linhas encontradas — vira o tooltip "Report de dd/mm" no cabeçalho da coluna; null se não há nenhuma linha (tabela ainda vazia, ou ninguém da equipe tem anterior). */
  dataCorteMaisFrequente: string | null;
}

const EQUIPE_VAZIA: KpiAnteriorEquipe = { porOperador: {}, dataCorteMaisFrequente: null };

/**
 * Único slug consumido por esta rota — o selo de evolução na tabela é só
 * pra Tx. Retenção Bruta. Restringir aqui (na query, não no client) evita
 * puxar linhas de outros KPIs que a rota não usa mais.
 */
const SLUG_TX_RETENCAO_BRUTA = "tx_retencao_bruta";

type RowBruta = {
  operator_email: string;
  valor_numerico: number | null;
  data_corte: string;
};

/**
 * Busca o valor ANTERIOR de tx_retencao_bruta (kpi_monthly_snapshots_anterior)
 * de um conjunto fixo de emails — usada só pro mês atual (a tabela nova é
 * preenchida por trigger a cada importação com data_corte mais novo; não
 * existe "anterior do anterior" pra meses passados). Mesmo padrão de
 * resolução de candidatos de getKpiEquipePorEmails
 * (lib/kpi/gestor/get-kpi-equipe-gestor.ts, não alterado), sem duplicar
 * aquele arquivo.
 *
 * NÃO filtra aqui por data_corte do report atual — isso é feito depois, em
 * `filtrarKpiAnteriorPorDataCorte`, pra esta busca poder rodar em paralelo
 * com a do report atual no Promise.all de page.tsx (o filtro só precisa do
 * resultado já buscado, não faz I/O).
 */
export async function getKpiAnteriorPorEmails(
  emailsOriginal: string[],
  mesRef: string,
): Promise<KpiAnteriorEquipe> {
  if (emailsOriginal.length === 0) return EQUIPE_VAZIA;

  const candidatosMap = await resolveKpiEmailCandidatesForProfiles(emailsOriginal);
  const todosCandidatos = [
    ...new Set(
      emailsOriginal.flatMap(
        (e) => candidatosMap.get(e.trim().toLowerCase()) ?? [e.trim().toLowerCase()],
      ),
    ),
  ];

  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("kpi_monthly_snapshots_anterior")
    .select("operator_email, valor_numerico, data_corte")
    .eq("mes_ref", mesRef)
    .eq("kpi_slug", SLUG_TX_RETENCAO_BRUTA)
    .in("operator_email", todosCandidatos);

  if (error) {
    console.error("[getKpiAnteriorPorEmails] erro ao buscar report anterior:", {
      mesRef,
      message: error.message,
      code: error.code,
    });
    return EQUIPE_VAZIA;
  }

  if (!rows || rows.length === 0) return EQUIPE_VAZIA;

  // Uma linha por email: se houver mais de uma (ex.: reprocessamento), fica
  // a de data_corte mais recente.
  const porEmailBruto = new Map<string, RowBruta>();
  for (const r of rows as RowBruta[]) {
    const key = r.operator_email.toLowerCase();
    const atual = porEmailBruto.get(key);
    if (!atual || r.data_corte > atual.data_corte) porEmailBruto.set(key, r);
  }

  const porOperador: KpiAnteriorPorOperador = {};
  for (const emailOriginal of emailsOriginal) {
    const emailNorm = emailOriginal.trim().toLowerCase();
    const candidatos = candidatosMap.get(emailNorm) ?? [emailNorm];
    const linha = candidatos.map((c) => porEmailBruto.get(c)).find((r) => r !== undefined);
    if (!linha || linha.valor_numerico === null) continue;
    porOperador[emailNorm] = { valor: Number(linha.valor_numerico), dataCorte: linha.data_corte };
  }

  return { porOperador, dataCorteMaisFrequente: dataCorteMaisFrequenteDe(porOperador) };
}

function dataCorteMaisFrequenteDe(porOperador: KpiAnteriorPorOperador): string | null {
  const contagem = new Map<string, number>();
  for (const celula of Object.values(porOperador)) {
    contagem.set(celula.dataCorte, (contagem.get(celula.dataCorte) ?? 0) + 1);
  }
  let melhor: string | null = null;
  let max = 0;
  for (const [dataCorte, n] of contagem) {
    if (n > max) {
      max = n;
      melhor = dataCorte;
    }
  }
  return melhor;
}

/**
 * Aplica a regra "só considere linhas com data_corte anterior ao data_corte
 * atual" — separada da busca pra poder rodar em paralelo com
 * getKpiEquipePorEmails do mês atual no Promise.all de page.tsx (o
 * data_corte atual só fica pronto DEPOIS que aquela chamada resolve; esta
 * função não faz I/O, só filtra o resultado já buscado).
 */
export function filtrarKpiAnteriorPorDataCorte(
  equipe: KpiAnteriorEquipe,
  dataCorteAtual: string | null,
): KpiAnteriorEquipe {
  if (!dataCorteAtual) return equipe;

  const porOperador: KpiAnteriorPorOperador = {};
  for (const [email, celula] of Object.entries(equipe.porOperador)) {
    if (celula.dataCorte < dataCorteAtual) porOperador[email] = celula;
  }

  return { porOperador, dataCorteMaisFrequente: dataCorteMaisFrequenteDe(porOperador) };
}
