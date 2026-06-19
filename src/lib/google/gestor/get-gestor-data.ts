import {
  pairContractsWithClients,
  parseContractsList,
  parseNumber,
  parsePercent,
} from "../d1/parse";
import { getSheetsClient } from "../sheets-client";
import type {
  GestorConsolidado,
  GestorContrato,
  GestorData,
  GestorMotivosConsolidados,
  GestorOperadorLinha,
  MotivosBreakdown,
  TxPorMotivo,
} from "./types";

export const DEFAULT_GUIA_GESTOR = "ANA ANGELICA";

/**
 * Lê 6 colunas consecutivas a partir de `start` como um MotivosBreakdown.
 * Ordem fixa: financeiro, mud.endereço, ins.serviço, ins.atendimento,
 * mud.provedora, outros.
 */
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

/**
 * Lê a guia de leitura de um gestor (default "ANA ANGELICA") e devolve a
 * estrutura completa da equipe. Mapeamento em docs/pages/gestor-d-1.md.
 *
 * Nome de guia com espaço exige aspas simples no A1 notation:
 *   "'ANA ANGELICA'!A2:F100"
 *
 * Operadores (A–F), contratos (N–Q) e motivos por operador (S–AD) são lidos
 * num ÚNICO range (A2:AD100) para garantir o alinhamento na mesma linha —
 * evita o risco de casar ranges por índice quando há linhas vazias
 * intercaladas.
 *
 * Contratos: N–Q guardam LISTAS "/"-separadas por operador (não um contrato
 * por linha), no mesmo padrão da guia CONTRATOS do D-1. São achatados nas
 * listas da equipe (contratosRetidos / contratosCancelados), mas cada item
 * carrega o email do operador dono (campo `operador`) — preserva o vínculo
 * operador→contrato para a UI agrupar se quiser.
 */
export async function fetchGestorData(
  guia: string = DEFAULT_GUIA_GESTOR,
): Promise<GestorData> {
  const { sheets, sheetId } = getSheetsClient();
  const ref = (range: string) => `'${guia}'!${range}`;

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: [
      ref("A2:AD100"), // operadores (A–F) + contratos (N–Q) + motivos (S–AD)
      ref("H2:L2"), // consolidado da equipe (1 linha)
      ref("AF2:AQ2"), // motivos consolidados da equipe (1 linha, 12 valores)
      ref("AS2:AX2"), // tx por motivo (1 linha, 6 valores)
    ],
  });

  const opsRange = response.data.valueRanges?.[0]?.values ?? [];
  const consRow = response.data.valueRanges?.[1]?.values?.[0] ?? [];
  const motivosConsRow = response.data.valueRanges?.[2]?.values?.[0] ?? [];
  const txMotivoRow = response.data.valueRanges?.[3]?.values?.[0] ?? [];

  // Operadores + motivos na mesma linha (A=0..F=5, S=18..X=23, Y=24..AD=29).
  const operadores: GestorOperadorLinha[] = opsRange
    .filter((row) => String(row[0] ?? "").trim())
    .map((row) => ({
      nome: String(row[0] ?? "").trim(),
      gestora: String(row[1] ?? "").trim(),
      retidos: parseNumber(row[2]),
      cancelados: parseNumber(row[3]),
      pedidos: parseNumber(row[4]),
      txRetencao: parsePercent(row[5]),
      motivosRetidos: breakdownFromRow(row, 18), // S–X
      motivosCancelados: breakdownFromRow(row, 24), // Y–AD
    }));

  const consolidado: GestorConsolidado = {
    gestora: String(consRow[0] ?? "").trim(),
    retidos: parseNumber(consRow[1]),
    cancelados: parseNumber(consRow[2]),
    pedidos: parseNumber(consRow[3]),
    txRetencao: parsePercent(consRow[4]),
  };

  // Contratos: N–Q são listas "/"-separadas por operador (N/O = retidos,
  // P/Q = cancelados). Achata nas listas da equipe, carimbando o email do
  // operador (row[0]) em cada item para preservar o vínculo operador→contrato.
  const contratosRetidos: GestorContrato[] = [];
  const contratosCancelados: GestorContrato[] = [];
  for (const row of opsRange) {
    const operador = String(row[0] ?? "").trim();
    if (!operador) continue; // só linhas de operador
    for (const item of pairContractsWithClients(
      parseContractsList(row[13]), // N
      parseContractsList(row[14]), // O
    )) {
      contratosRetidos.push({ ...item, operador });
    }
    for (const item of pairContractsWithClients(
      parseContractsList(row[15]), // P
      parseContractsList(row[16]), // Q
    )) {
      contratosCancelados.push({ ...item, operador });
    }
  }

  const motivosConsolidados: GestorMotivosConsolidados = {
    retidos: breakdownFromRow(motivosConsRow, 0), // AF–AK
    cancelados: breakdownFromRow(motivosConsRow, 6), // AL–AQ
  };

  const txPorMotivo: TxPorMotivo = {
    financeiro: parsePercent(txMotivoRow[0]),
    mudancaEndereco: parsePercent(txMotivoRow[1]),
    insatisfacaoServico: parsePercent(txMotivoRow[2]),
    insatisfacaoAtendimento: parsePercent(txMotivoRow[3]),
    mudancaProvedora: parsePercent(txMotivoRow[4]),
    outros: parsePercent(txMotivoRow[5]),
  };

  return {
    operadores,
    consolidado,
    contratosRetidos,
    contratosCancelados,
    motivosConsolidados,
    txPorMotivo,
  };
}
