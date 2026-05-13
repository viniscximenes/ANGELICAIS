export type OperadorTempoLogado = {
  email: string;
  tempoLogado: string; // "HH:MM:SS" ou "00:00:00" se sem login
  tempoRestante: string; // "HH:MM:SS"
  logoutEstimado: string; // "HH:MM:SS"
};

export type OperadorLoginLogout = {
  email: string;
  horaLogin: string | null; // "HH:MM:SS" ou null se vazio
  horaLogout: string | null; // "HH:MM:SS", "00:00:00" (ainda logado), ou null se sem login
};

export type TempoLogadoData = {
  operadores: OperadorTempoLogado[];
  loginLogout: OperadorLoginLogout[];
  horaReport: string; // "HH:MM" da célula F2
};
