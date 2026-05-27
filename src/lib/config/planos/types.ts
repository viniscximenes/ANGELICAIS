export type Marca = {
  id: string;
  nome: string;
  isActive: boolean;
  planosCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Plano = {
  id: string;
  marcaId: string;
  nome: string;
  valor: number;
  temOtt: boolean;
  isActive: boolean;
  ordem: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanoWithMarca = Plano & {
  marcaNome: string;
};

export type RegraDesconto = {
  id: string;
  temOtt: boolean;
  tempoMinMeses: number;
  tempoMaxMeses: number | null;
  descontoMaxPct: number;
  duracaoMeses: number;
  ordem: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegraGrouped = {
  semOtt: RegraDesconto[];
  comOtt: RegraDesconto[];
};
