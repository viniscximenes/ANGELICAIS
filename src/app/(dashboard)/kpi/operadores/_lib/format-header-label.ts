/**
 * Sentence case pros títulos de coluna da tabela — transforma só a
 * APRESENTAÇÃO de kpi_definitions.displayName (já formatado em Title Case
 * no banco, ex. "Tx. Retenção Bruta", "ABS", "% Variação Ticket"), sem
 * alterar o banco nem os tipos. Siglas (palavras que já vêm 100% maiúsculas
 * na fonte, ex. "TMA", "ABS", "NR17", "CSAT") são preservadas como estão;
 * as demais palavras viram minúsculas, exceto a primeira letra da frase.
 *
 * Conferido contra os valores reais de kpi_definitions.display_name:
 * "Tx. Retenção Bruta" → "Tx. retenção bruta"
 * "Indisp Total" → "Indisp total"
 * "TMA" → "TMA"
 * "ABS" → "ABS"
 * "Retidos Brutos" → "Retidos brutos"
 * "% Variação Ticket" → "% variação ticket"
 */
export function formatHeaderLabel(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((palavra, idx) => {
      const letras = palavra.replace(/[^\p{L}]/gu, "");
      if (letras.length === 0) return palavra; // símbolo isolado ("%", "-")

      // Sigla: 2+ letras e já vem toda maiúscula na fonte — preserva.
      const ehSigla = letras.length >= 2 && letras === letras.toUpperCase();
      if (ehSigla) return palavra;

      if (idx === 0) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
      }
      return palavra.toLowerCase();
    })
    .join(" ");
}
