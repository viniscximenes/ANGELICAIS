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
    swatches: ["#FAF9F5", "#EDE9DE", "#DAD9D4", "#C96442", "#3D3929"],
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "vercel";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}
