import type { HoraEvolucaoData } from "./get-evolucao-hora";

export type QuedaData = {
  horaAnterior: number;
  hora: number;
  labelAnterior: string;
  label: string;
  txAnterior: number;
  txAtual: number;
  quedaPontos: number; // Ex: 7.5% -> 7.5
};

/**
 * Analisa a sequência cronológica de horas do turno e detecta quedas na taxa de retenção.
 * 
 * Limiar padrão: queda >= 2.0 pontos percentuais.
 */
export function getQuedas(evolucao: HoraEvolucaoData[], txAcumuladaManha?: number | null): QuedaData[] {
  const quedas: QuedaData[] = [];
  const LIMIAR_QUEDA = 2.0; // 2.0 pontos percentuais

  // Se estiver no turno da tarde (primeira hora é 14) e possuir a média acumulada da manhã
  if (
    evolucao.length > 0 && 
    evolucao[0].hora === 14 && 
    txAcumuladaManha !== undefined && 
    txAcumuladaManha !== null
  ) {
    const curr = evolucao[0];
    if (curr.tx !== null) {
      const diff = txAcumuladaManha - curr.tx;
      const quedaPontos = diff * 100;

      if (quedaPontos >= LIMIAR_QUEDA) {
        quedas.push({
          horaAnterior: 13,
          hora: 14,
          labelAnterior: "Acumulado Manhã",
          label: "14:00",
          txAnterior: txAcumuladaManha,
          txAtual: curr.tx,
          quedaPontos: parseFloat(quedaPontos.toFixed(1)),
        });
      }
    }
  }

  for (let i = 1; i < evolucao.length; i++) {
    const prev = evolucao[i - 1];
    const curr = evolucao[i];

    // Só compara se ambas as horas possuírem dados/taxas válidas
    if (prev.tx !== null && curr.tx !== null) {
      const diff = prev.tx - curr.tx;
      const quedaPontos = diff * 100;

      if (quedaPontos >= LIMIAR_QUEDA) {
        quedas.push({
          horaAnterior: prev.hora,
          hora: curr.hora,
          labelAnterior: prev.label,
          label: curr.label,
          txAnterior: prev.tx,
          txAtual: curr.tx,
          quedaPontos: parseFloat(quedaPontos.toFixed(1)),
        });
      }
    }
  }

  // Ordena pelas maiores quedas (mais graves primeiro)
  return quedas.sort((a, b) => b.quedaPontos - a.quedaPontos);
}
