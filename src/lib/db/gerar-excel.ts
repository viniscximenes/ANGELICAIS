import ExcelJS from "exceljs";

import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { MESES_PT } from "./mes-range";
import type { RegistroFinalizado } from "./types";

// Mesmo padrão visual das exportações PNG do D-1 (equipe-table.tsx):
// header #1F4E78, texto branco em negrito.
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E78" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true };

const COLUMNS: Array<{ header: string; key: string; width: number }> = [
  { header: "Data", key: "data", width: 12 },
  { header: "Agente", key: "agente", width: 22 },
  { header: "Tipo", key: "tipo", width: 16 },
  { header: "Pausa/Motivo", key: "motivo", width: 26 },
  { header: "Duração", key: "duracao", width: 12 },
  { header: "Tema", key: "tema", width: 28 },
  { header: "Texto Gerado", key: "texto", width: 90 },
];

/**
 * Um workbook com 1 sheet por mês presente em `registros` (nome "Agosto
 * 2026" etc.) — na prática a página do supervisor sempre chama isso já
 * filtrado por um único mês (toggle atual/passado), então normalmente sai
 * 1 sheet só, mas a função é genérica.
 */
export async function gerarExcelDiarioDeBordo(
  registros: RegistroFinalizado[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const porMes = new Map<string, RegistroFinalizado[]>();
  for (const r of registros) {
    const chave = r.dataRef.slice(0, 7); // YYYY-MM
    const grupo = porMes.get(chave);
    if (grupo) {
      grupo.push(r);
    } else {
      porMes.set(chave, [r]);
    }
  }

  for (const chave of Array.from(porMes.keys()).sort()) {
    const [anoStr, mesStr] = chave.split("-");
    const nomeMes = MESES_PT[parseInt(mesStr, 10) - 1];
    const sheet = workbook.addWorksheet(`${nomeMes} ${anoStr}`);

    sheet.columns = COLUMNS;

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const linhas = (porMes.get(chave) ?? []).slice().sort((a, b) => {
      if (a.dataRef !== b.dataRef) return a.dataRef < b.dataRef ? -1 : 1;
      return a.agentUsername.localeCompare(b.agentUsername);
    });

    for (const r of linhas) {
      sheet.addRow({
        data: formatDateBR(r.dataRef),
        agente: r.agentUsername,
        tipo: r.tipo === "pausa" ? "Pausa" : "Tempo Logado",
        motivo: r.reasonCode ?? "—",
        duracao: r.duracao,
        tema: r.temaNome,
        texto: r.textoGerado,
      });
    }

    sheet.getColumn("texto").alignment = { wrapText: true, vertical: "top" };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
