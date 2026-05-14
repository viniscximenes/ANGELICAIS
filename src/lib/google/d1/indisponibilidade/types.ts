export type OperadorIndisp = {
  email: string;
  indispPercent: number | null; // ex: 12.3 (não 0.123). null se sem dados.
  tempoLogado: string; // "HH:MM:SS"
};

export type OperadorPausa = {
  email: string;
  tempoIndisponivel: string; // col B
  pausa10: string; // col C
  pausa20: string; // col D
  pausaParticular: string; // col E
  pausaMonitoramento: string; // col F (pausa monitoramento/tarefa)
  pausaTreinamento: string; // col G (treinamento/reunião)
  pausaFeedback: string; // col H
  pausaPrePausa: string; // col I
  pausaAtivo: string; // col J
  pausaTakeBlip: string; // col K
  pausaOperacional: string; // col N (col L e M são ignoradas)
  pausaEmail: string; // col O
  pausaIndisponivel: string; // col P
  pausaSistema: string; // col Q
  nr17: string; // calculado: pausa10 + pausa20
};

export type IndisponibilidadeData = {
  operadoresIndisp: OperadorIndisp[];
  operadoresPausa: OperadorPausa[];
  horaReport: string; // "HH:MM" lida de TEMPO LOGADO!F2
};
