import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { KpiValueType } from "@/lib/kpi/types";

/**
 * PREPARAÇÃO, não ativação (pedido explícito) — com `false` (padrão), o
 * valor sai idêntico ao formatKpiValue compartilhado de sempre (separador
 * decimal ".", ex. "78.1%"). Com `true`, troca só nesta tabela pro padrão
 * pt-BR ("78,1%", "-13,3%"). TMA e outros `time` (mm:ss / hhh:mm) nunca
 * mudam — não têm separador decimal. formatKpiValue (compartilhado com
 * /kpi/detalhado-polo) não é alterado.
 */
export const USAR_VIRGULA_DECIMAL = false;

export function formatKpiValueLocal(valor: number | null, valueType: KpiValueType): string {
  const base = formatKpiValue(valor, valueType);
  if (!USAR_VIRGULA_DECIMAL || valueType === "time") return base;
  return base.replace(".", ",");
}
