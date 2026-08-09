import { getEmailPrefix } from "@/lib/utils/email-variants";
import type { OperadorQuartilItem } from "./get-quartil-operadores";

export type QuartilInfo = {
  /** null quando o operador não teve atendimento no dia (fora do ranking). */
  quartil: "Q1" | "Q2" | "Q3" | "Q4" | null;
  tx: number | null;
  /** Posição no escopo, 1 = melhor TX. */
  rank: number | null;
  /** Quantos operadores entraram no ranking daquele escopo. */
  totalOperadores: number;
};

export type QuartilOperador = {
  equipe: QuartilInfo;
  empresa: QuartilInfo;
};

function paraInfo(
  item: OperadorQuartilItem | undefined,
  totalOperadores: number,
): QuartilInfo {
  if (!item || item.quartil === null || item.rank === null) {
    return { quartil: null, tx: item?.tx ?? null, rank: null, totalOperadores };
  }
  return {
    quartil: `Q${item.quartil}` as QuartilInfo["quartil"],
    tx: item.tx,
    rank: item.rank,
    totalOperadores,
  };
}

/**
 * Monta o quartil de cada operador nos dois escopos, a partir dos rankings que
 * a action JÁ calcula (`getQuartilOperadores` para equipe e para empresa).
 *
 * É função pura de propósito: não abre consulta nova. O ranking do polo custa
 * uma varredura da tabela inteira e não faz sentido pagá-la duas vezes.
 *
 * Indexado por PREFIXO do email — o roster guarda @alloha.com e a base de
 * retenção pode trazer o mesmo operador sob @sumicity.net.br.
 */
export function montarQuartilPorOperador(
  rankingEquipe: OperadorQuartilItem[],
  rankingEmpresa: OperadorQuartilItem[],
): Record<string, QuartilOperador> {
  // Só quem entrou no ranking (tem TX) conta para o total do escopo.
  const totalEquipe = rankingEquipe.filter((o) => o.rank !== null).length;
  const totalEmpresa = rankingEmpresa.filter((o) => o.rank !== null).length;

  const porPrefixoEquipe = new Map<string, OperadorQuartilItem>();
  for (const o of rankingEquipe) porPrefixoEquipe.set(getEmailPrefix(o.login), o);

  const porPrefixoEmpresa = new Map<string, OperadorQuartilItem>();
  for (const o of rankingEmpresa) porPrefixoEmpresa.set(getEmailPrefix(o.login), o);

  const resultado: Record<string, QuartilOperador> = {};
  // A união cobre operador que está só num dos escopos.
  const prefixos = new Set([...porPrefixoEquipe.keys(), ...porPrefixoEmpresa.keys()]);

  for (const prefixo of prefixos) {
    resultado[prefixo] = {
      equipe: paraInfo(porPrefixoEquipe.get(prefixo), totalEquipe),
      empresa: paraInfo(porPrefixoEmpresa.get(prefixo), totalEmpresa),
    };
  }

  return resultado;
}

const INFO_VAZIA: QuartilInfo = {
  quartil: null,
  tx: null,
  rank: null,
  totalOperadores: 0,
};

/**
 * Operador sem atendimento no dia não entra em ranking nenhum. Em vez de
 * sumir com a seção, devolvemos um quartil vazio para a tela exibir "—".
 */
export const QUARTIL_VAZIO: QuartilOperador = {
  equipe: INFO_VAZIA,
  empresa: INFO_VAZIA,
};

/** Lookup tolerante a domínio: aceita o email completo do operador. */
export function quartilDoOperador(
  mapa: Record<string, QuartilOperador>,
  email: string,
): QuartilOperador {
  return mapa[getEmailPrefix(email)] ?? QUARTIL_VAZIO;
}
