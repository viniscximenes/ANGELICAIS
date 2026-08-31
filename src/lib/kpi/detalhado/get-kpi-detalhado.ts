import { deriveNomeOperador, formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { enrichWithDefinitions } from "@/lib/kpi/atual/enrich-with-definitions";
import type { KpiStatus } from "@/lib/kpi/atual/status-color";
import { getKpiDefinitions } from "@/lib/kpi/get-definitions";
import type { KpiValueType } from "@/lib/kpi/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

import { COLUNAS_KPI_DETALHADO } from "./colunas-kpi-detalhado";
import { formatStatusLabel } from "./status-format";

const PAGE_SIZE = 1000;
const META_GESTOR_SLUG = "meta_gestor";
const META_STATUS_SLUG = "meta_status";

export type GestorOpcao = { id: string; nome: string };

export type KpiDetalhadoColuna = {
  slug: string;
  label: string;
  valueType: KpiValueType;
};

export type KpiDetalhadoCelula = {
  slug: string;
  valor: number | null;
  /** Preenchido só quando a célula veio como texto (valor_numerico nulo). */
  valorTexto: string | null;
  valueType: KpiValueType;
  status: KpiStatus;
};

export type KpiDetalhadoLinha = {
  email: string;
  /** Sempre nome.sobrenome (prefixo do e-mail) — esta tela nunca usa nome fantasia. */
  nome: string;
  /** Chave do filtro de gestor = o próprio nome já em Title Case (null = sem meta_gestor). */
  gestorId: string | null;
  gestorNome: string;
  /** meta_status já em Title Case com acento ("—" se ausente). */
  statusLabel: string;
  celulas: KpiDetalhadoCelula[];
};

export type KpiDetalhadoData = {
  mesRef: string;
  dataCorte: string | null;
  colunas: KpiDetalhadoColuna[];
  /** Lista pro filtro da coluna "Gestor" — nomes distintos de meta_gestor (inclui não-cadastrados). */
  gestores: GestorOpcao[];
  /** Operadores de TODAS as equipes, em ordem aleatória (mistura livre). */
  linhas: KpiDetalhadoLinha[];
};

function getCurrentMesRef(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Fisher-Yates — embaralha uma cópia. */
function embaralhar<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type SnapshotRow = {
  operator_email: string;
  kpi_slug: string;
  valor_numerico: number | string | null;
  valor_texto: string | null;
  data_corte: string | null;
};

/**
 * Espelho da planilha de KPI para TODOS os operadores com dado em
 * kpi_monthly_snapshots no mês mais recente.
 *
 * Fonte 100% dentro de kpi_monthly_snapshots — NÃO passa por
 * d1_operadores_gestor / profiles / config de equipe:
 *  - lista de operadores  = distinct operator_email do mês corrente;
 *  - gestor de cada um     = valor_texto de kpi_slug='meta_gestor' (Title Case);
 *  - colunas              = lista FIXA de 46 (COLUNAS_KPI_DETALHADO), cada
 *                           célula é o valor bruto do slug — sem delta/cálculo.
 *                           Status/cor só é herdado dos slugs que têm linha em
 *                           kpi_definitions com coloring_type != 'none'.
 *
 * Sem nome fantasia: o nome exibido é sempre nome.sobrenome (prefixo do e-mail).
 */
export async function getKpiDetalhado(): Promise<KpiDetalhadoData> {
  const admin = createAdminClient();
  const definitions = await getKpiDefinitions();

  // Mês mais recente com dado importado.
  const { data: ultimoMes } = await admin
    .from("kpi_monthly_snapshots")
    .select("mes_ref")
    .order("mes_ref", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mesRef = (ultimoMes?.mes_ref as string | undefined) ?? getCurrentMesRef();

  // Puxa TODAS as linhas do mês, paginando (uma tabela-mês passa fácil do
  // teto de ~1000 linhas do PostgREST). Ordem total determinística p/ o
  // .range() não pular/duplicar entre páginas; data_corte ascendente por
  // último pra que, havendo mais de um corte no mês, o mais recente
  // sobrescreva.
  const porOperador = new Map<
    string,
    {
      values: Map<string, number | null>;
      textos: Map<string, string | null>;
      metaGestor: string | null;
      metaStatus: string | null;
    }
  >();
  let dataCorteMax: string | null = null;

  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const from = page * PAGE_SIZE;
    const { data, error } = await admin
      .from("kpi_monthly_snapshots")
      .select("operator_email, kpi_slug, valor_numerico, valor_texto, data_corte")
      .eq("mes_ref", mesRef)
      .order("operator_email", { ascending: true })
      .order("kpi_slug", { ascending: true })
      .order("data_corte", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[getKpiDetalhado] erro ao buscar snapshots:", error.message);
      break;
    }

    const rows = (data ?? []) as SnapshotRow[];
    for (const row of rows) {
      const email = row.operator_email.trim().toLowerCase();
      let entry = porOperador.get(email);
      if (!entry) {
        entry = {
          values: new Map(),
          textos: new Map(),
          metaGestor: null,
          metaStatus: null,
        };
        porOperador.set(email, entry);
      }

      if (row.kpi_slug === META_GESTOR_SLUG) {
        const t = row.valor_texto?.trim();
        if (t) entry.metaGestor = t;
      } else if (row.kpi_slug === META_STATUS_SLUG) {
        const t = row.valor_texto?.trim();
        if (t) entry.metaStatus = t;
      } else if (row.valor_numerico !== null) {
        entry.values.set(row.kpi_slug, Number(row.valor_numerico));
      } else if (row.valor_texto !== null && row.valor_texto.trim() !== "") {
        // Coluna que veio como texto (ex.: "Atendimentos Transfer.Texto").
        entry.textos.set(row.kpi_slug, row.valor_texto.trim());
      }

      if (row.data_corte && (!dataCorteMax || row.data_corte > dataCorteMax)) {
        dataCorteMax = row.data_corte;
      }
    }

    hasMore = rows.length === PAGE_SIZE;
    page += 1;
  }

  // Ordem/label das 46 colunas: lista FIXA desta página (não deriva de
  // kpi_definitions). Ver colunas-kpi-detalhado.ts.
  const colunas: KpiDetalhadoColuna[] = COLUNAS_KPI_DETALHADO.map((c) => ({
    slug: c.slug,
    label: c.label,
    valueType: c.valueType,
  }));

  const nomesGestor = new Set<string>();

  const linhas: KpiDetalhadoLinha[] = [...porOperador.entries()].map(
    ([email, { values, textos, metaGestor, metaStatus }]) => {
      const extra = {
        forecastPedidos: values.get("forecast_pedidos") ?? null,
        forecastChurn: values.get("forecast_churn") ?? null,
        txRetencaoBruta: values.get("tx_retencao_bruta") ?? null,
      };
      // Só serve pra herdar status/cor dos slugs que TÊM linha em
      // kpi_definitions (tx_retencao_bruta, tma, abs...). Slug sem def →
      // valor cru + status neutro. Nenhum cálculo novo é feito aqui.
      const principal = enrichWithDefinitions(definitions, values, extra, "principal");
      const secundario = enrichWithDefinitions(definitions, values, extra, "secundario");

      const gestorNome = metaGestor ? formatNomeProprio(metaGestor) : "—";
      if (metaGestor) nomesGestor.add(gestorNome);

      return {
        email,
        nome: deriveNomeOperador(email),
        gestorId: metaGestor ? gestorNome : null,
        gestorNome,
        statusLabel: formatStatusLabel(metaStatus),
        celulas: COLUNAS_KPI_DETALHADO.map((col) => {
          const e = principal.get(col.slug) ?? secundario.get(col.slug);
          const valor = e?.valor ?? values.get(col.slug) ?? null;
          return {
            slug: col.slug,
            valor,
            valorTexto: valor === null ? (textos.get(col.slug) ?? null) : null,
            valueType: col.valueType,
            status: (e?.status ?? "neutral") as KpiStatus,
          };
        }),
      };
    },
  );

  const gestores: GestorOpcao[] = [...nomesGestor]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ id: nome, nome }));

  return {
    mesRef,
    dataCorte: dataCorteMax,
    colunas,
    gestores,
    linhas: embaralhar(linhas),
  };
}
