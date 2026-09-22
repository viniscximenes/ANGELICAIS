import type { OperadorTma } from "./get-gestor-tma";
import { SKILL_BUCKET_LABELS, type SkillBucket } from "./skills-retencao";

export type OperadorPesoDesigual = {
  operatorEmail: string;
  qtdAtendimentos: number;
  temaDominante: string; // label de SKILL_BUCKET_LABELS
  percentual: number; // 0-100
};

/** Piso mínimo de atendimentos pra entrar na lista — evita falso positivo de baixo volume (ex.: 1 atendimento sempre dá 100%). Decidido em rodada anterior com dado real (piso 3 e 5 dão o mesmo resultado hoje; 5 é o mais seguro). */
export const PISO_MINIMO_ATENDIMENTOS_PESO_DESIGUAL = 5;

/** Limiar de concentração num único tema pra entrar na lista. */
const LIMIAR_PCT_PESO_DESIGUAL = 0.8;

const CAMPO_POR_BUCKET: { bucket: SkillBucket; campo: keyof OperadorTma }[] = [
  { bucket: "outros", campo: "qtdOutros" },
  { bucket: "criticos", campo: "qtdCriticos" },
  { bucket: "mudEndereco", campo: "qtdMudEndereco" },
  { bucket: "financeiro", campo: "qtdFinanceiro" },
  { bucket: "qualidade", campo: "qtdQualidade" },
  { bucket: "concorrencia", campo: "qtdConcorrencia" },
  { bucket: "hotlineChurn", campo: "qtdHotlineChurn" },
];

/**
 * Operadores concentrando a maior parte dos atendimentos do dia num único
 * tema — usa os campos qtd_* já carregados por getGestorTma (d1_tma), sem
 * query nova. Critério: maior bucket ÷ qtdAtendimentos >= 80%, só pra quem
 * tem pelo menos PISO_MINIMO_ATENDIMENTOS_PESO_DESIGUAL atendimentos no dia.
 * Ordenado do mais concentrado pro menos.
 */
export function calcularPesoDesigual(operadores: OperadorTma[]): OperadorPesoDesigual[] {
  const resultado: OperadorPesoDesigual[] = [];

  for (const op of operadores) {
    if (op.qtdAtendimentos < PISO_MINIMO_ATENDIMENTOS_PESO_DESIGUAL) continue;

    let bucketDominante: SkillBucket | null = null;
    let maiorQtd = 0;
    for (const { bucket, campo } of CAMPO_POR_BUCKET) {
      const qtd = op[campo] as number;
      if (qtd > maiorQtd) {
        maiorQtd = qtd;
        bucketDominante = bucket;
      }
    }
    if (bucketDominante === null) continue;

    const percentual = (maiorQtd / op.qtdAtendimentos) * 100;
    if (percentual >= LIMIAR_PCT_PESO_DESIGUAL * 100) {
      resultado.push({
        operatorEmail: op.operatorEmail,
        qtdAtendimentos: op.qtdAtendimentos,
        temaDominante: SKILL_BUCKET_LABELS[bucketDominante],
        percentual,
      });
    }
  }

  return resultado.sort((a, b) => b.percentual - a.percentual);
}
