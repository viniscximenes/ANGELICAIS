export type KbTipo = "artigo" | "instrucao";

export type KbAnexoTipo = "pdf" | "imagem";

export type KbArtigo = {
  id: string;
  titulo: string;
  conteudo: string;
  // Palavras-chave/sinônimos cadastrados pelo admin para ajudar a busca por
  // relevância (ver src/lib/kb/relevancia.ts) a encontrar este artigo.
  palavrasChave: string[];
  ativo: boolean;
  tipo: KbTipo;
  link: string | null;
  dataPublicacao: string | null;
  createdAt: string;
  updatedAt: string;
  // Caminho do arquivo no Storage (bucket privado "kb-anexos") — não é uma
  // URL utilizável diretamente. Use anexoUrlAssinada para exibir/abrir.
  anexoPath: string | null;
  anexoTipo: KbAnexoTipo | null;
  anexoNome: string | null;
  // URL assinada e temporária, calculada sob demanda (ver src/lib/kb/anexo.ts)
  // — nunca persistida, só preenchida quando o artigo tem anexoPath.
  anexoUrlAssinada?: string | null;
};

export type KbConfig = {
  id: string;
  promptSistema: string;
  updatedAt: string;
};
