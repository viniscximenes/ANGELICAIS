import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";

/**
 * Formatação e categorização do `meta_status` (kpi_monthly_snapshots,
 * kpi_slug='meta_status', valor_texto) para a coluna "Status" de
 * /operacao/kpi-detalhado.
 *
 * Módulo puro (sem imports de servidor). Tolerante a valor novo/desconhecido:
 * nunca quebra — cai no Title Case do texto cru. Exibido como texto simples
 * (sem badge/cor) na tabela.
 */

function norm(v: string | null | undefined): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

// O valor bruto vem em CAIXA ALTA sem acento — estes precisam de acento na
// exibição, que o Title Case genérico não recupera.
const LABELS_COM_ACENTO: Record<string, string> = {
  ATIVO: "Ativo",
  DESLIGADO: "Desligado",
  FERIAS: "Férias",
  "AFASTAMENTO PREVIDENCIA": "Afastamento Previdência",
};

/**
 * Texto exibido no badge. Conhecidos → rótulo com acento; desconhecido →
 * Title Case do texto como veio (sem inventar acento), em vez de quebrar.
 */
export function formatStatusLabel(raw: string | null | undefined): string {
  const v = norm(raw);
  if (!v) return "—";
  if (LABELS_COM_ACENTO[v]) return LABELS_COM_ACENTO[v];
  if (v.startsWith("FERIAS")) return "Férias";
  if (v.startsWith("AF.PREV") || v.startsWith("AFASTAMENTO PREV")) {
    return "Afastamento Previdência";
  }
  if (v.startsWith("LICENCA MATERNIDADE")) return "Licença Maternidade";
  if (v.startsWith("LICENCA")) return "Licença";
  if (v.startsWith("MOVIMENTACAO")) return "Movimentação";
  return formatNomeProprio((raw ?? "").trim());
}
