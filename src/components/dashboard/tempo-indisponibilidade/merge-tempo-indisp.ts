import {
  PAUSAS_ZERADAS,
  type GestorIndispLinha,
  type GestorTempoLogadoLinha,
  type PausasDetalhe,
  type StatusPresenca,
} from "@/lib/d1-db/types";

export type OperadorAnaliticoTempoIndisp = {
  email: string;
  tempoLogado: string;
  tempoLogadoSegundos: number;
  cumpriuMetaTL: boolean;
  statusTL: StatusPresenca;
  horaLogin: string | null;
  horaLogout: string | null;
  indisponibilidade: number | null;
  cumpriuMetaIndisp: boolean;
  nr17Pct: number | null;
  pausaParticularPct: number | null;
  /** Soma das pausas que não são NR17 nem Particular — ver GestorIndispLinha.outrasPausasPct. */
  outrasPausasPct: number | null;
  pausas: PausasDetalhe;
  pausa10PrimeiraHora: string | null;
  pausa10SegundaHora: string | null;
  pausa20Hora: string | null;
};

/**
 * Junta d1_tempo_logado e d1_indisponibilidade (mesmo roster, chaveado por
 * e-mail) num único registro por operador — usado só pela UI do analítico.
 *
 * `cumpriuMetaIndisp` é calculado AQUI, com a meta atual da tela
 * (indisponibilidade < meta, estrito) — único lugar do veredito. Antes vinha
 * pronto do servidor e, logo depois de salvar uma meta nova, ainda era o da
 * meta anterior: a tabela/dialog divergiam do card de resumo.
 */
export function mergeOperadoresTempoIndisp(
  operadoresTL: GestorTempoLogadoLinha[],
  operadoresIndisp: GestorIndispLinha[],
  metaIndisponibilidade: number,
): OperadorAnaliticoTempoIndisp[] {
  const indispPorEmail = new Map(operadoresIndisp.map((op) => [op.email, op]));

  return operadoresTL.map((tl) => {
    const indisp = indispPorEmail.get(tl.email);
    return {
      email: tl.email,
      tempoLogado: tl.tempoLogado,
      tempoLogadoSegundos: tl.tempoLogadoSegundos,
      cumpriuMetaTL: tl.cumpriuMeta,
      statusTL: tl.status,
      horaLogin: tl.horaLogin,
      horaLogout: tl.horaLogout,
      indisponibilidade: indisp?.indisponibilidade ?? null,
      cumpriuMetaIndisp:
        indisp?.indisponibilidade != null && indisp.indisponibilidade < metaIndisponibilidade,
      nr17Pct: indisp?.nr17Pct ?? null,
      pausaParticularPct: indisp?.pausaParticularPct ?? null,
      outrasPausasPct: indisp?.outrasPausasPct ?? null,
      pausas: indisp?.pausas ?? PAUSAS_ZERADAS,
      pausa10PrimeiraHora: indisp?.pausa10PrimeiraHora ?? null,
      pausa10SegundaHora: indisp?.pausa10SegundaHora ?? null,
      pausa20Hora: indisp?.pausa20Hora ?? null,
    };
  });
}
