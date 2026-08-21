export type KbTipo = "artigo" | "instrucao";

export type KbArtigo = {
  id: string;
  titulo: string;
  conteudo: string;
  tags: string[];
  ativo: boolean;
  tipo: KbTipo;
  link: string | null;
  dataPublicacao: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KbConfig = {
  id: string;
  promptSistema: string;
  updatedAt: string;
};
