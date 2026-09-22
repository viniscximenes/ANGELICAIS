import { BUCKETS, bucketDe } from "@/lib/retencao/get-evolucao-hora";
import { statusTmaDe, type TmaStatus, type TmaThresholdConfig } from "./tma-status-pure";

export type OperadorAbaixoDaMeta = {
  /** Parte local do e-mail, minúsculo — ver comentário em evolucao-tma-chart.tsx sobre por que é literal aqui. */
  emailLocal: string;
  tmaMedioSegundos: number;
};

export type TmaHoraData = {
  /** Chave do bucket — MESMA régua de get-evolucao-hora.ts (Consolidado): 7 = "< 08", 8..19 = a própria hora, 20 = "≥ 20". */
  hora: number;
  label: string;
  /** Quantidade de atendimentos no bucket (todos os operadores). */
  total: number;
  /** TMA médio PONDERADO do bucket (soma duracao_segundos ÷ total) — null se o bucket não teve nenhum atendimento. */
  tmaMedioSegundos: number | null;
  /** Status do bucket (contra o MESMO threshold/direção da tabela principal) — usado pra colorir barra/linha. */
  status: TmaStatus;
  /** Operadores cujo TMA médio DENTRO deste bucket (não do dia inteiro) está "danger" — qualquer volume, sem piso mínimo. */
  abaixoDaMeta: OperadorAbaixoDaMeta[];
};

type AtendimentoBruto = {
  operator_email: string;
  hora: string | null;
  duracao_segundos: number;
};

/** "HH:MM:SS" -> hora inteira (0-23). Formato inválido/nulo -> null. */
function horaInteiraDe(hora: string | null): number | null {
  if (!hora) return null;
  const h = parseInt(hora.split(":")[0] ?? "", 10);
  return Number.isNaN(h) ? null : h;
}

/**
 * Evolução do TMA por bucket de hora, pra equipe de um gestor — MESMA régua
 * de buckets do gráfico de evolução do Consolidado (bucketDe/BUCKETS,
 * get-evolucao-hora.ts, reaproveitados por leitura, sem alterar o arquivo).
 * Pura (sem I/O): recebe os atendimentos já buscados por
 * getGestorTmaAnalitico (mesma query, sem round-trip novo) e o threshold já
 * resolvido (getTmaThresholdConfig, tma-status.ts) — não duplica o cálculo
 * de meta em nenhum dos dois lugares.
 */
export function calcularEvolucaoTmaPorHora(
  atendimentos: AtendimentoBruto[],
  thresholdConfig: TmaThresholdConfig,
): TmaHoraData[] {
  const somaPorBucket = new Map<number, number>();
  const qtdPorBucket = new Map<number, number>();
  // bucket -> operator_email -> { soma, qtd }
  const porBucketOperador = new Map<number, Map<string, { soma: number; qtd: number }>>();

  for (const b of BUCKETS) {
    somaPorBucket.set(b.hora, 0);
    qtdPorBucket.set(b.hora, 0);
    porBucketOperador.set(b.hora, new Map());
  }

  for (const at of atendimentos) {
    const h = horaInteiraDe(at.hora);
    if (h === null) continue; // sem hora não dá pra posicionar no eixo — fica fora do gráfico, mesmo critério do Consolidado.

    const bucket = bucketDe(h);
    somaPorBucket.set(bucket, (somaPorBucket.get(bucket) ?? 0) + at.duracao_segundos);
    qtdPorBucket.set(bucket, (qtdPorBucket.get(bucket) ?? 0) + 1);

    const porOperador = porBucketOperador.get(bucket)!;
    const email = at.operator_email.trim().toLowerCase();
    const acc = porOperador.get(email) ?? { soma: 0, qtd: 0 };
    acc.soma += at.duracao_segundos;
    acc.qtd += 1;
    porOperador.set(email, acc);
  }

  return BUCKETS.map((b) => {
    const total = qtdPorBucket.get(b.hora) ?? 0;
    const soma = somaPorBucket.get(b.hora) ?? 0;
    const tmaMedioSegundos = total > 0 ? soma / total : null;
    const status = statusTmaDe(tmaMedioSegundos, thresholdConfig);

    const porOperador = porBucketOperador.get(b.hora)!;
    const abaixoDaMeta: OperadorAbaixoDaMeta[] = [];
    for (const [email, acc] of porOperador) {
      const media = acc.soma / acc.qtd;
      if (statusTmaDe(media, thresholdConfig) === "danger") {
        abaixoDaMeta.push({ emailLocal: email.split("@")[0] ?? email, tmaMedioSegundos: media });
      }
    }
    abaixoDaMeta.sort((a, b2) => b2.tmaMedioSegundos - a.tmaMedioSegundos);

    return { hora: b.hora, label: b.label, total, tmaMedioSegundos, status, abaixoDaMeta };
  });
}
