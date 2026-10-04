// Régua de buckets de hora — módulo PURO (sem Supabase), separado de
// get-evolucao-hora.ts pra poder ser importado por componentes client
// (ex: tma-detalhe-dialog via get-gestor-tma-evolucao-hora) sem puxar o
// client admin pro bundle do navegador.

/**
 * Horas de operação (08h–19h). Usado pelos alertas para varrer hora a hora.
 */
const HORAS_OPERACAO = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const BUCKET_ANTES = 7;
const BUCKET_DEPOIS = 20;

/**
 * Os 14 buckets do gráfico: tudo antes das 08h num só, cada hora cheia entre
 * 08h e 19h, e tudo a partir das 20h num só. Assim nenhum atendimento fica de
 * fora do gráfico, mesmo os registrados fora da janela de operação.
 */
export const BUCKETS: { hora: number; label: string }[] = [
  { hora: BUCKET_ANTES, label: "< 08" },
  ...HORAS_OPERACAO.map((h) => ({
    hora: h,
    label: `${String(h).padStart(2, "0")}:00`,
  })),
  { hora: BUCKET_DEPOIS, label: "≥ 20" },
];

/**
 * Encaixa uma hora_bucket crua no bucket correspondente. Exportada para que a
 * análise individual por operador use exatamente a mesma régua do gráfico
 * geral — se os buckets mudarem aqui, mudam nos dois lugares.
 */
export function bucketDe(hora: number): number {
  if (hora < 8) return BUCKET_ANTES;
  if (hora >= 20) return BUCKET_DEPOIS;
  return hora;
}
