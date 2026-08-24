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
  "envie",
  "mande",
  "todos",
  "todas",
  "voce",
  "possui",
  "dados",
  "artigo",
  "existe",
  "existem",
  "buscar",
  "procurar",
  "quero",
  "preciso",
  "tenho",
  "temos",
  // Preposições/artigos curtos (>= 2 chars) — não carregam significado de
  // busca sozinhas, então não devem contar como termo de match.
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "ou",
]);

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    // Normaliza separadores (/, -, _, |, •) em espaços para que
    // "mascaras/ocorrencias" case com "mascaras" e "ocorrencias"
    .replace(/[/\-_|•]+/g, " ");
}

/**
 * Mapa de sinônimos/expansão de domínio.
 * Quando a pergunta contém uma chave, os termos do array são adicionados
 * como palavras extras de busca — permite que variações cotidianas da
 * operação de retenção encontrem o artigo certo.
 */
const SINONIMOS: Record<string, string[]> = {
  // Máscaras / BKO
  mascara: ["mascara", "ocorrencia", "bko", "chamado", "fila"],
  mascaras: ["mascara", "ocorrencia", "bko", "chamado", "fila"],
  ocorrencia: ["mascara", "ocorrencia", "bko", "chamado"],
  ocorrencias: ["mascara", "ocorrencia", "bko", "chamado"],
  bko: ["bko", "mascara", "ocorrencia", "chamado"],
  chamado: ["chamado", "bko", "mascara", "ocorrencia"],
  // Financeiro
  financeiro: ["financeiro", "bko financeiro", "financ"],
  // Fidelidade / multa
  fidelidade: ["fidelidade", "contratual", "multa", "permanencia"],
  multa: ["multa", "fidelidade", "contratual"],
  contratual: ["contratual", "fidelidade", "multa"],
  // Book / material
  book: ["book", "material", "treinamento", "arquivo", "apostila"],
  material: ["material", "book", "treinamento", "arquivo"],
  // Retenção / cancelamento
  retencao: ["retencao", "cancelamento", "churn", "salvar"],
  cancelamento: ["cancelamento", "retencao", "churn"],
  churn: ["churn", "retencao", "cancelamento"],
  // Planos / oferta
  plano: ["plano", "oferta", "produto", "pacote"],
  oferta: ["oferta", "plano", "produto", "pacote"],
  produto: ["produto", "plano", "oferta", "pacote"],
  // Protocolo / atendimento
  protocolo: ["protocolo", "atendimento", "registro"],
  atendimento: ["atendimento", "protocolo", "procedimento"],
  // Supervisor
  supervisor: ["supervisor", "gestor", "lider"],
  gestor: ["gestor", "supervisor", "lider"],
  // TMA / tempo
  tma: ["tma", "tempo", "media", "atendimento"],
  // Ouvidoria
  ouvidoria: ["ouvidoria", "reclamacao", "procon", "anatel"],
  reclamacao: ["reclamacao", "ouvidoria", "procon"],
};

/**
 * Expande as palavras-chave da pergunta com sinônimos do domínio.
 * Retorna um Set sem duplicatas.
 */
function expandirPalavras(palavras: string[]): string[] {
  const expandidas = new Set<string>(palavras);
  for (const p of palavras) {
    const extras = SINONIMOS[p];
    if (extras) extras.forEach((e) => expandidas.add(e));
  }
  return Array.from(expandidas);
}

/**
 * Gera a forma plural/singular alternativa de uma palavra (heurística simples
 * de português: troca só o "s" final) para que "mascara" case com "mascaras"
 * e vice-versa sem precisar cadastrar as duas formas.
 */
function variantePlural(palavra: string): string | null {
  if (palavra.length <= 3) return null;
  if (palavra.endsWith("s")) return palavra.slice(0, -1);
  return `${palavra}s`;
}

/**
 * Expande a lista de palavras com sua variante plural/singular.
 */
function comFormasPluralSingular(palavras: string[]): string[] {
  const expandidas = new Set<string>(palavras);
  for (const p of palavras) {
    const variante = variantePlural(p);
    if (variante) expandidas.add(variante);
  }
  return Array.from(expandidas);
}

/**
 * Verifica se uma palavra-chave cadastrada no artigo (já normalizada) deve
 * ser considerada um "gatilho direto" para a pergunta — ou seja, se a
 * palavra-chave apareceu (mesmo parcialmente) na pergunta do gestor.
 *
 * Duas formas de match:
 * 1. A palavra-chave inteira aparece como substring literal da pergunta
 *    normalizada (cobre o caso comum: keyword de uma ou várias palavras
 *    citada quase literalmente).
 * 2. Todas as palavras da keyword (ignorando stopwords, com variante
 *    plural/singular) aparecem em algum lugar da pergunta, mesmo fora de
 *    ordem — cobre frases parafraseadas ("cobranças indevidas" batendo com
 *    a keyword "cobrança indevida").
 */
function ehGatilhoDireto(keywordNormalizada: string, perguntaNormalizada: string): boolean {
  if (keywordNormalizada.length < 2) return false;
  if (perguntaNormalizada.includes(keywordNormalizada)) return true;

  const palavrasKeyword = keywordNormalizada
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  if (palavrasKeyword.length === 0) return false;

  return palavrasKeyword.every((w) => {
    if (perguntaNormalizada.includes(w)) return true;
    const variante = variantePlural(w);
    return variante ? perguntaNormalizada.includes(variante) : false;
  });
}

// Pesos por camada — título e palavra-chave pesam mais que match solto no
// corpo do texto; gatilho direto (keyword cadastrada batendo com a pergunta
// inteira) pesa mais que tudo, pois é o sinal mais forte de que o admin
// cadastrou esse artigo pensando exatamente nesse tipo de pergunta.
const PESO_GATILHO_DIRETO = 10;
const PESO_TITULO = 5;
const PESO_PALAVRA_CHAVE = 4;
const PESO_CONTEUDO = 1;

/**
 * Busca por relevância expandida (sem vector DB):
 * - Compara a pergunta contra título, palavras-chave e conteúdo, nessa
 *   ordem de prioridade/peso (título > palavra-chave > conteúdo solto)
 * - Cada palavra-chave cadastrada funciona como "gatilho direto": se aparecer
 *   (mesmo parcialmente/normalizada) na pergunta, o artigo fica altamente
 *   relevante
 * - Normaliza separadores (/, -, _) em espaços antes do match
 * - Expande termos da pergunta com sinônimos do domínio e variantes de
 *   plural/singular
 * - Busca por prefixo em palavras longas (≥6 chars)
 * - Captura termos curtos (≥2 chars) como "bko", "tma"
 * - Retorna TODOS os artigos ordenados por score — sem filtro de score mínimo —
 *   para garantir que o contexto da IA seja sempre completo. Múltiplos
 *   artigos aparecem no topo se baterem com palavras-chave diferentes.
 */
export function buscarArtigosRelevantes(
  pergunta: string,
  artigos: KbArtigo[],
  limite = 20,
): KbArtigo[] {
  const perguntaNormalizada = normalizar(pergunta);

  // Threshold mínimo: 2 chars (captura "bko", "tma", "nf") em vez de > 3
  const palavrasBase = perguntaNormalizada
    .split(/\W+/)
    .filter((p) => p.length >= 2 && !STOPWORDS.has(p));

  // Sem palavras úteis — retorna todos ordenados pela posição original
  if (palavrasBase.length === 0) return artigos.slice(0, limite);

  const palavras = comFormasPluralSingular(expandirPalavras(palavrasBase));

  const scored = artigos.map((artigo) => {
    const textoTitulo = normalizar(artigo.titulo);
    const textoPalavrasChave = normalizar(artigo.palavrasChave.join(" "));
    const textoConteudo = normalizar(artigo.conteudo.slice(0, 800));
    const textoCompleto = `${textoTitulo} ${textoPalavrasChave} ${textoConteudo}`;

    let score = 0;

    // Gatilho direto: cada palavra-chave cadastrada é comparada contra a
    // pergunta inteira, não palavra a palavra.
    for (const keyword of artigo.palavrasChave) {
      if (ehGatilhoDireto(normalizar(keyword), perguntaNormalizada)) {
        score += PESO_GATILHO_DIRETO;
      }
    }

    // Match por camada, token a token da pergunta expandida.
    for (const p of palavras) {
      if (textoTitulo.includes(p)) {
        score += PESO_TITULO;
      } else if (textoPalavrasChave.includes(p)) {
        score += PESO_PALAVRA_CHAVE;
      } else if (textoConteudo.includes(p)) {
        score += PESO_CONTEUDO;
      } else if (p.length >= 6) {
        // Busca por prefixo para palavras longas — captura raízes
        const prefixo = p.slice(0, Math.ceil(p.length * 0.75));
        if (textoCompleto.includes(prefixo)) score += PESO_CONTEUDO;
      }
    }

    return { artigo, score };
  });

  // Sem filtro de score mínimo: retorna TODOS ordenados por relevância.
  // Artigos com score > 0 ficam no topo; os demais vêm depois como fallback.
  // Isso garante que a IA sempre receba o contexto completo da KB.
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((s) => s.artigo);
}
