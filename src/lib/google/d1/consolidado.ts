import { getSheetsClient } from "../sheets-client";
import { parseHora, parseNumber, parsePercent } from "./parse";
import type {
  ConsolidadoData,
  OperadorConsolidado,
  TotaisSupervisor,
} from "./types";

/**
 * Parseia os blocos de totais por supervisor da faixa H1:K200.
 *
 * SUPOSIÇÃO (células mescladas): a Google Sheets values API retorna o valor
 * de uma célula mesclada apenas na célula superior-esquerda; as demais vêm
 * vazias/undefined. Como o nome do supervisor é mesclado em H:K, a "linha de
 * nome" tem texto em H (row[0]) e I/J/K (row[1..3]) vazias. A linha
 * imediatamente abaixo é a "linha de dados" (H=retido, I=canc, J=ped, K=tx),
 * e uma linha totalmente vazia separa um bloco do próximo.
 *
 * Estrutura esperada (repetida verticalmente):
 *   [Supervisor — mesclado H:K]   ← linha de nome
 *   retido | canc | ped | tx      ← linha de dados
 *   (linha vazia)                 ← separador
 */
function parseTotaisPorSupervisor(rows: unknown[][]): TotaisSupervisor[] {
  const totais: TotaisSupervisor[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const nome = String(row[0] ?? "").trim();
    // Linha de nome: H preenchido e I/J/K vazios (efeito da célula mesclada).
    const temDadosNaLinha = row[1] != null || row[2] != null || row[3] != null;

    if (nome && !temDadosNaLinha) {
      const dataRow = rows[i + 1] ?? [];
      totais.push({
        supervisor: nome,
        retidos: parseNumber(dataRow[0]),
        cancelados: parseNumber(dataRow[1]),
        pedidos: parseNumber(dataRow[2]),
        txRetencao: parsePercent(dataRow[3]),
      });
      i++; // pula a linha de dados já consumida
    }
  }

  return totais;
}

export async function fetchConsolidado(): Promise<ConsolidadoData> {
  const { sheets, sheetId } = getSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: [
      "CONSOLIDADO!A2:F500", // operadores (A=email, B=supervisor, C..F=números)
      "CONSOLIDADO!H1:K200", // blocos de totais por supervisor (empilhados)
      "CONSOLIDADO!M2", // hora do report
    ],
  });

  const opsRange = response.data.valueRanges?.[0]?.values ?? [];
  const blocosRange = response.data.valueRanges?.[1]?.values ?? [];
  const horaCell = response.data.valueRanges?.[2]?.values?.[0]?.[0];

  const operadores: OperadorConsolidado[] = opsRange
    .filter((row) => row[0])
    .map((row) => ({
      email: String(row[0]).trim().toLowerCase(),
      supervisor: String(row[1] ?? "").trim(),
      retidos: parseNumber(row[2]),
      cancelados: parseNumber(row[3]),
      pedidos: parseNumber(row[4]),
      txRetencao: parsePercent(row[5]),
    }));

  const totaisPorSupervisor = parseTotaisPorSupervisor(blocosRange);
  const horaReport = parseHora(horaCell);

  return { operadores, totaisPorSupervisor, horaReport };
}
