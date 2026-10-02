import { ThemePreview, type ThemePreviewColors } from "@/components/ui/theme-preview"
import type { PaletteId } from "@/lib/theme/palettes"

// Tokens escuros de cada paleta (src/app/palettes/*.css) — a miniatura
// acompanha a paleta ativa pra ser fiel ao que o site vai mostrar.
export const DARK_PREVIEW: Record<PaletteId, ThemePreviewColors> = {
  vercel: {
    window: "oklch(0.155 0 0)", // --sidebar-nav
    content: "oklch(0 0 0)", // --background
    dot: "oklch(0.72 0 0)", // --muted-foreground
    navItem: "oklch(0.23 0 0)", // --muted
    navActive: "oklch(0.32 0 0)", // --accent
    navMuted: "oklch(0.2 0 0)",
    textStrong: "oklch(1 0 0)", // --foreground
    textMuted: "oklch(0.4 0 0)",
    block: "oklch(0.14 0 0)", // --card
    accent: "oklch(0.72 0 0)",
    shadeOpacity: 0.32,
  },
  "claude-amber": {
    window: "#1A1918",
    content: "#262624",
    dot: "#B7B5A9",
    navItem: "#2C2C2B",
    navActive: "#3E3E38",
    navMuted: "#1F1E1D",
    textStrong: "#F1F1EF",
    textMuted: "#5A5954",
    block: "#2C2C2B",
    accent: "#D97757",
    shadeOpacity: 0.32,
  },
}

export const DarkTheme = ({ palette }: { palette: PaletteId }) => (
  <ThemePreview colors={DARK_PREVIEW[palette]} />
)
