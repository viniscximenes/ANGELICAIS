/**
 * Resolve a guia de leitura do gestor logado.
 *
 * Convenção da planilha: username "nome.sobrenome" → aba "NOME SOBRENOME".
 * Confirmado nos 8 supervisores existentes:
 *   ana.angelica      → "ANA ANGELICA"
 *   gabriel.ximenes   → "GABRIEL XIMENES"
 *   juliana.ferreira  → "JULIANA FERREIRA"
 *   joao.vilela       → "JOAO VILELA"
 *   vitor.gomes       → "VITOR GOMES"
 *   patricia.dalmasio → "PATRICIA DALMASIO"
 *   samira.leao       → "SAMIRA LEAO"
 *   fernanda.queiroz  → "FERNANDA QUEIROZ"
 *
 * Aceita username ("gabriel.ximenes") ou e-mail ("gabriel.ximenes@alloha.com").
 * Retorna null apenas se o identificador estiver vazio.
 *
 * ATENÇÃO: a guia derivada pode não existir na planilha (gestor criado mas aba
 * ainda não montada no Sheets). Nesse caso, fetchGestorData/fetchGestorTempoLogado
 * vão lançar erro de API ("Unable to parse range"). Recomenda-se um try/catch
 * nessas funções retornando estado vazio, com a página exibindo mensagem amigável.
 */
export function resolveGuiaGestor(identificador: string): string | null {
  if (!identificador.trim()) return null;
  const username = identificador.includes("@")
    ? identificador.split("@")[0]
    : identificador;
  const guia = username.trim().toLowerCase().split(".").join(" ").toUpperCase();
  return guia || null;
}

/**
 * Devolve o nome da guia de tempo logado ("<GUIA>2").
 * Ex: "GABRIEL XIMENES" → "GABRIEL XIMENES2"
 */
export function resolveGuiaTempoLogado(identificador: string): string | null {
  const guia = resolveGuiaGestor(identificador);
  return guia ? `${guia}2` : null;
}
