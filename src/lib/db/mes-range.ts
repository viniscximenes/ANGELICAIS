import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";
import type { MesSelecionado } from "./types";

export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type RangeDoMes = {
  /** Primeiro dia do mês (YYYY-MM-DD), inclusivo. */
  inicio: string;
  /** Primeiro dia do mês seguinte (YYYY-MM-DD), exclusivo. */
  fimExclusivo: string;
  /** Ex: "Agosto 2026". */
  label: string;
};

/**
 * Range de datas do mês atual ou passado, na hora de Brasília — mesmo corte
 * usado pela retenção (aplicarRetencaoPausas).
 */
export function getRangeDoMes(mes: MesSelecionado): RangeDoMes {
  const { year, month } = getDatePartsInBR();

  const targetMonth = mes === "atual" ? month : month === 1 ? 12 : month - 1;
  const targetYear = mes === "atual" ? year : month === 1 ? year - 1 : year;

  const inicio = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;

  const proximoMonth = targetMonth === 12 ? 1 : targetMonth + 1;
  const proximoYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  const fimExclusivo = `${proximoYear}-${String(proximoMonth).padStart(2, "0")}-01`;

  const label = `${MESES_PT[targetMonth - 1]} ${targetYear}`;

  return { inicio, fimExclusivo, label };
}
