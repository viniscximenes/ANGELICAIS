/**
 * Registro das paletas visuais disponíveis ao gestor (seletor "Paleta" do
 * card de tema). Para adicionar uma nova, inclua uma entrada aqui e os
 * tokens CSS escopados por [data-palette="<id>"] (src/app/palettes/),
 * importados em src/app/layout.tsx.
 *
 * `swatches` são só a amostra exibida no seletor (do linho mais claro ao
 * grafite), não os tokens aplicados.
 */
export const PALETTES = [
  {
    id: "vercel",
    label: "Vercel",
    description: "Monocromático, preto e branco com cinzas neutros",
    swatches: ["#FFFFFF", "#F7F7F7", "#EBEBEB", "#707070", "#000000"],
  },
  {
    id: "claude-amber",
    label: "Claude Amber",
    description: "Tons de papel e areia com acento âmbar",
    swatches: ["#FBFBF8", "#ECEAE3", "#D6D4CD", "#C96442", "#29261B"],
  },
  {
    id: "sage-garden",
    label: "Sage Garden",
    description: "Verde-sálvia sobre papel e grafite",
    swatches: ["#F8F7F4", "#E8E6E1", "#BFC9BB", "#7C9082", "#1A1F2E"],
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "vercel";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

// Paleta ainda não tem coluna no perfil; fica no navegador até existir
// motivo pra persistir no banco.
export const PALETTE_STORAGE_KEY = "palette-preference";

/**
 * Script inline do <head> (root layout): aplica a paleta salva no
 * localStorage durante o parse do HTML, antes do primeiro paint. Sem ele o
 * SSR sempre sai com DEFAULT_PALETTE e o ThemeProvider só troca depois da
 * hidratação — todo reload (ex.: anexo de base, que faz
 * window.location.reload) piscava a Vercel antes da paleta escolhida.
 */
export const PALETTE_EARLY_SCRIPT = `
(function () {
  try {
    var p = localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});
    if (${JSON.stringify(PALETTES.map((p) => p.id))}.indexOf(p) !== -1) {
      document.documentElement.setAttribute("data-palette", p);
    }
  } catch (e) {}
})();
`;
