export type DiarioCaso =
  | "pausa_autorizada"
  | "fora_jornada"
  | "geral"
  | "outros";

export type DiarioRegistro = {
  id: string;
  operatorEmail: string;
  caso: DiarioCaso;
  dataOcorrido: string;

  tempoLogadoSegundos: number | null;
  tempoAJustificarSegundos: number | null;
  tempoSegundos: number | null;

  glpi: string | null;
  descricao: string;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

export type DiarioRegistroWithName = DiarioRegistro & {
  operatorName: string | null;
};

export type CasoOption = {
  value: DiarioCaso;
  label: string;
};

export const CASO_OPTIONS: CasoOption[] = [
  { value: "pausa_autorizada", label: "Pausa Autorizada" },
  { value: "fora_jornada", label: "Fora de Jornada" },
  { value: "geral", label: "Geral" },
  { value: "outros", label: "Outros" },
];

export type OperatorWithCount = {
  id: string;
  fullName: string;
  emailCorporativo: string;
  role: string;
  registrosCount: number;
  countByCaso: {
    pausa_autorizada: number;
    fora_jornada: number;
    geral: number;
    outros: number;
  };
};
