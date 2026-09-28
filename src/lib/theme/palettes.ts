/**
 * Registro das paletas visuais disponíveis ao gestor (seletor "Paleta" do
 * card de tema). Hoje só existe Zen Linen — para adicionar uma nova, inclua
 * uma entrada aqui e os tokens CSS escopados por [data-palette="<id>"].
 *
 * `swatches` são só a amostra exibida no seletor (do linho mais claro ao
 * grafite), não os tokens aplicados.
 */
export const PALETTES = [
  {
    id: "zen-linen",
    label: "Zen Linen",
    description: "Tons de linho bege com grafite",
    swatches: ["#F4EFE4", "#E9E4D8", "#D8D2C4", "#A89F8F", "#2E2E2E"],
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "zen-linen";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}
