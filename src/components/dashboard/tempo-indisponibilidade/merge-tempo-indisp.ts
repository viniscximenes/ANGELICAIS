import type {
  GestorIndispLinha,
  GestorTempoLogadoLinha,
  PausasDetalhe,
  StatusPresenca,
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
  pausas: PausasDetalhe;
  pausa10PrimeiraHora: string | null;
  pausa10SegundaHora: string | null;
  pausa20Hora: string | null;
};

const PAUSAS_ZERADAS: PausasDetalhe = {
  pausa10: "00:00:00",
  pausa20: "00:00:00",
  pausaParticular: "00:00:00",
  monOuTaref: "00:00:00",
  trenOuReun: "00:00:00",
  feedback: "00:00:00",
  prePausa: "00:00:00",
  ativo: "00:00:00",
  takeBlip: "00:00:00",
  pausa15: "00:00:00",
  pausa40: "00:00:00",
  operacional: "00:00:00",
  email: "00:00:00",
  indisponivel: "00:00:00",
  sistema: "00:00:00",
  pausaSemMotivo: "00:00:00",
};

/**
 * Junta d1_tempo_logado e d1_indisponibilidade (mesmo roster, chaveado por
 * e-mail) num único registro por operador — usado só pela UI do analítico.
 */
export function mergeOperadoresTempoIndisp(
  operadoresTL: GestorTempoLogadoLinha[],
  operadoresIndisp: GestorIndispLinha[],
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
      cumpriuMetaIndisp: indisp?.cumpriuMeta ?? false,
      pausas: indisp?.pausas ?? PAUSAS_ZERADAS,
      pausa10PrimeiraHora: indisp?.pausa10PrimeiraHora ?? null,
      pausa10SegundaHora: indisp?.pausa10SegundaHora ?? null,
      pausa20Hora: indisp?.pausa20Hora ?? null,
    };
  });
}
