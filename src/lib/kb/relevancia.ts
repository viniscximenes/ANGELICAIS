import type { KbArtigo } from "./types";

const STOPWORDS = new Set([
  "para",
  "como",
  "isso",
  "esse",
  "essa",
  "aquele",
  "aquela",
  "sobre",
  "quando",
  "onde",
  "porque",
  "qual",
  "quais",
  "pode",
  "posso",
  "fazer",
  "tem",
  "com",
  "uma",
  "umas",
  "uns",
  "que",
  "não",
  "mais",
  "muito",
]);

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

/**
 * Busca por relevância simples (sem vector DB): filtra artigos cujo título
 * ou tags casam com palavras-chave da pergunta. Sem match, cai pro fallback
 * (primeiros artigos) pra nunca mandar contexto vazio pro modelo.
 */
export function buscarArtigosRelevantes(
  pergunta: string,
  artigos: KbArtigo[],
  limite = 10,
): KbArtigo[] {
  const palavras = normalizar(pergunta)
    .split(/\W+/)
    .filter((p) => p.length > 3 && !STOPWORDS.has(p));

  if (palavras.length === 0) return artigos.slice(0, limite);

  const scored = artigos.map((artigo) => {
    const texto = normalizar(
      `${artigo.titulo} ${artigo.tags.join(" ")} ${artigo.link ?? ""}`,
    );
    const score = palavras.filter((p) => texto.includes(p)).length;
    return { artigo, score };
  });

  const relevantes = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((s) => s.artigo);

  return relevantes.length > 0 ? relevantes : artigos.slice(0, limite);
}
