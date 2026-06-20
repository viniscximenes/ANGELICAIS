import { getSheetsClient } from "../sheets-client";
import {
  pairContractsWithClients,
  parseContractsList,
  parseHora,
  parseNumber,
  parsePercent,
} from "./parse";
import type {
  D1Data,
  ConsolidadoData,
  OperadorConsolidado,
  TotaisSupervisor,
  OperadorContratos,
  OperadorMotivos,
  MotivosBreakdown,
} from "./types";

export type * from "./types";

const SUPERVISORES = [
  "ANA ANGELICA",
  "JULIANA FERREIRA",
  "JOAO VILELA",
  "GABRIEL XIMENES",
  "VITOR GOMES",
  "PATRICIA DALMASIO",
  "SAMIRA LEAO",
  "FERNANDA QUEIROZ",
];

function breakdownFromRow(row: unknown[], start: number): MotivosBreakdown {
  return {
    financeiro: parseNumber(row[start]),
    mudancaEndereco: parseNumber(row[start + 1]),
    insatisfacaoServico: parseNumber(row[start + 2]),
    insatisfacaoAtendimento: parseNumber(row[start + 3]),
    mudancaProvedora: parseNumber(row[start + 4]),
    outros: parseNumber(row[start + 5]),
  };
}

export async function getD1Data(): Promise<D1Data> {
  const { sheets, sheetId } = getSheetsClient();

  const ranges = [
    "'BASE - 1'!S2",
    ...SUPERVISORES.flatMap((s) => [
      `'${s}'!A2:AD100`, // operadores + contratos + motivos
      `'${s}'!H2:L2`    // totais
    ])
  ];

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  const valueRanges = response.data.valueRanges ?? [];
  const horaCell = valueRanges[0]?.values?.[0]?.[0];
  const horaReport = parseHora(horaCell);

  const consolidadoOperadores: OperadorConsolidado[] = [];
  const totaisPorSupervisor: TotaisSupervisor[] = [];
  const contratos: OperadorContratos[] = [];
  const motivos: OperadorMotivos[] = [];

  for (let i = 0; i < SUPERVISORES.length; i++) {
    const supervisor = SUPERVISORES[i];
    
    // Range de operadores is at 1 + 2 * i
    const opsValues = valueRanges[1 + 2 * i]?.values ?? [];
    for (const row of opsValues) {
      const email = String(row[0] ?? "").trim().toLowerCase();
      if (!email) continue;
      
      // 1. Mapeia para OperadorConsolidado
      consolidadoOperadores.push({
        email,
        supervisor: String(row[1] ?? supervisor).trim(),
        retidos: parseNumber(row[2]),
        cancelados: parseNumber(row[3]),
        pedidos: parseNumber(row[4]),
        txRetencao: parsePercent(row[5]),
      });

      // 2. Mapeia contratos (N=13, O=14, P=15, Q=16)
      const canceladosContratos = pairContractsWithClients(
        parseContractsList(row[15]),
        parseContractsList(row[16])
      );
      const retidosContratos = pairContractsWithClients(
        parseContractsList(row[13]),
        parseContractsList(row[14])
      );
      contratos.push({
        email,
        cancelados: canceladosContratos,
        retidos: retidosContratos,
      });

      // 3. Mapeia motivos (S=18..X=23 retidos, Y=24..AD=29 cancelados)
      motivos.push({
        email,
        retidos: breakdownFromRow(row, 18),
        cancelados: breakdownFromRow(row, 24),
      });
    }

    // Range de totais is at 2 + 2 * i
    const totRow = valueRanges[2 + 2 * i]?.values?.[0] ?? [];
    if (totRow[0] || totRow[1] != null) {
      totaisPorSupervisor.push({
        supervisor: String(totRow[0] ?? supervisor).trim(),
        retidos: parseNumber(totRow[1]),
        cancelados: parseNumber(totRow[2]),
        pedidos: parseNumber(totRow[3]),
        txRetencao: parsePercent(totRow[4]),
      });
    }
  }

  const consolidado: ConsolidadoData = {
    operadores: consolidadoOperadores,
    totaisPorSupervisor,
    horaReport,
  };

  return { consolidado, contratos, motivos };
}

export async function fetchConsolidado(): Promise<ConsolidadoData> {
  const data = await getD1Data();
  return data.consolidado;
}

export async function fetchContratos(): Promise<OperadorContratos[]> {
  const data = await getD1Data();
  return data.contratos;
}

export async function fetchMotivos(): Promise<OperadorMotivos[]> {
  const data = await getD1Data();
  return data.motivos;
}
