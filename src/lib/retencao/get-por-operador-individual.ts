import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailPrefix } from "@/lib/utils/email-variants";
import { aplicarFiltroEscopo } from "./escopo";
import { BUCKETS, bucketDe, type HoraEvolucaoData } from "./get-evolucao-hora";
import { normalizarTema } from "./normalizar-tema";

export type MotivoOperador = {
  motivo: string;
  retidos: number;
  cancelados: number;
  total: number;
  tx: number | null;
};

export type OperadorIndividual = {
  /** Email canônico do roster (@alloha.com) — chave estável do operador. */
  login: string;
  /** usuario_nome cru do banco, quando o operador teve atendimento. */
  nomeBanco: string | null;
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null;
  /** Mesmos 14 buckets do gráfico geral, só com os dados deste operador. */
  porHora: HoraEvolucaoData[];
  /** Só os motivos que o operador de fato atendeu, do mais volumoso ao menor. */
  porMotivo: MotivoOperador[];
};

type Linha = {
  usuario_login: string;
  usuario_nome: string | null;
  motivo: string | null;
  hora_bucket: number | null;
  foi_cancelamento: boolean | null;
};

type Acumulador = {
  login: string;
  nomeBanco: string | null;
  total: number;
  retidos: number;
  cancelados: number;
  porHora: Map<number, { total: number; retidos: number; cancelados: number }>;
  porMotivo: Map<string, { retidos: number; cancelados: number; total: number }>;
};

function novoAcumulador(login: string): Acumulador {
  const porHora = new Map<number, { total: number; retidos: number; cancelados: number }>();
  for (const b of BUCKETS) porHora.set(b.hora, { total: 0, retidos: 0, cancelados: 0 });
  return {
    login,
    nomeBanco: null,
    total: 0,
    retidos: 0,
    cancelados: 0,
    porHora,
    porMotivo: new Map(),
  };
}

function taxa(retidos: number, total: number): number | null {
  return total > 0 ? retidos / total : null;
}

/**
 * Análise individual por operador: totais, evolução por hora (mesmos buckets
 * do gráfico geral) e quebra por motivo.
 *
 * A agregação toda acontece no servidor. O cliente recebe só o resultado por
 * operador — não as centenas de linhas cruas de retencao_atendimentos.
 *
 * A lista inclui TODOS os operadores do roster: quem não teve atendimento no
 * dia vem com total 0 e `tx: null`, para aparecer como "sem dados" na tela em
 * vez de simplesmente sumir.
 */
export async function getPorOperadorIndividual(
  emailsEquipe: string[],
): Promise<OperadorIndividual[]> {
  const supabase = createAdminClient();

  let todas: Linha[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("retencao_atendimentos")
      .select("usuario_login, usuario_nome, motivo, hora_bucket, foi_cancelamento")
      .range(page * pageSize, page * pageSize + pageSize - 1);

    query = aplicarFiltroEscopo(query, { emailsEquipe });

    const { data, error } = await query;
    if (error) {
      console.error("[getPorOperadorIndividual] erro ao consultar:", error.message);
      throw new Error(error.message);
    }

    const lista = (data ?? []) as Linha[];
    todas = todas.concat(lista);
    if (lista.length < pageSize) hasMore = false;
    else page++;
  }

  // Chave por prefixo do email: o roster guarda @alloha.com, mas a base de
  // retenção pode trazer o mesmo operador sob @sumicity.net.br.
  const porPrefixo = new Map<string, Acumulador>();

  // Semeia com o roster, para que operador sem atendimento apareça na lista.
  for (const email of emailsEquipe) {
    porPrefixo.set(getEmailPrefix(email), novoAcumulador(email.trim().toLowerCase()));
  }

  for (const linha of todas) {
    if (!linha.usuario_login) continue;
    const prefixo = getEmailPrefix(linha.usuario_login);

    let acc = porPrefixo.get(prefixo);
    if (!acc) {
      // Operador presente na base mas fora do roster — mantém para não
      // esconder atendimento de ninguém.
      acc = novoAcumulador(linha.usuario_login.trim().toLowerCase());
      porPrefixo.set(prefixo, acc);
    }

    if (!acc.nomeBanco && linha.usuario_nome) acc.nomeBanco = linha.usuario_nome;

    const cancelado = linha.foi_cancelamento === true;
    acc.total++;
    if (cancelado) acc.cancelados++;
    else acc.retidos++;

    if (linha.hora_bucket !== null && linha.hora_bucket !== undefined) {
      const alvo = acc.porHora.get(bucketDe(linha.hora_bucket));
      if (alvo) {
        alvo.total++;
        if (cancelado) alvo.cancelados++;
        else alvo.retidos++;
      }
    }

    // Mesmo agrupamento do bloco "Retenção por Tema" — sem isso os
    // sub-motivos apareceriam como linhas separadas no popup.
    const motivo = normalizarTema(linha.motivo);
    const m = acc.porMotivo.get(motivo) ?? { retidos: 0, cancelados: 0, total: 0 };
    m.total++;
    if (cancelado) m.cancelados++;
    else m.retidos++;
    acc.porMotivo.set(motivo, m);
  }

  const operadores: OperadorIndividual[] = [...porPrefixo.values()].map((acc) => ({
    login: acc.login,
    nomeBanco: acc.nomeBanco,
    total: acc.total,
    retidos: acc.retidos,
    cancelados: acc.cancelados,
    tx: taxa(acc.retidos, acc.total),
    porHora: BUCKETS.map((b) => {
      const h = acc.porHora.get(b.hora)!;
      return {
        hora: b.hora,
        label: b.label,
        total: h.total,
        retidos: h.retidos,
        cancelados: h.cancelados,
        tx: taxa(h.retidos, h.total),
      };
    }),
    porMotivo: [...acc.porMotivo.entries()]
      .map(([motivo, v]) => ({
        motivo,
        retidos: v.retidos,
        cancelados: v.cancelados,
        total: v.total,
        tx: taxa(v.retidos, v.total),
      }))
      .sort((a, b) => b.total - a.total),
  }));

  // TX decrescente (melhor → pior); quem não teve atendimento vai para o fim.
  return operadores.sort((a, b) => {
    if (a.tx === null && b.tx === null) return a.login.localeCompare(b.login);
    if (a.tx === null) return 1;
    if (b.tx === null) return -1;
    if (b.tx !== a.tx) return b.tx - a.tx;
    return b.total - a.total;
  });
}
