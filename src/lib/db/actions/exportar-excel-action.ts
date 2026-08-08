"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { gerarExcelDiarioDeBordo } from "@/lib/db/gerar-excel";
import { getRangeDoMes } from "@/lib/db/mes-range";
import type { MesSelecionado } from "@/lib/db/types";
import { getFinalizadosAction } from "./get-finalizados-action";

export type ExportarExcelResult =
  | { success: true; base64: string; filename: string }
  | { success: false; error: string };

const DIACRITICS_REGEX = /[̀-ͯ]/g;

/** "Agosto 2026" -> "agosto_2026" (sem acento, minúsculo). */
function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/\s+/g, "_");
}

export async function exportarExcelAction(
  mes: MesSelecionado,
): Promise<ExportarExcelResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (user.profile.role !== "GESTOR") {
    return { success: false, error: "Sem permissão" };
  }

  const registros = await getFinalizadosAction(mes);
  if (registros.length === 0) {
    return { success: false, error: "Nenhum registro finalizado nesse mês" };
  }

  const { label } = getRangeDoMes(mes);

  let buffer: Buffer;
  try {
    buffer = await gerarExcelDiarioDeBordo(registros);
  } catch (err) {
    console.error("[exportar-excel] erro ao gerar workbook:", err);
    return { success: false, error: "Erro ao gerar o Excel" };
  }

  return {
    success: true,
    base64: buffer.toString("base64"),
    filename: `diario_de_bordo_${slugifyLabel(label)}.xlsx`,
  };
}
