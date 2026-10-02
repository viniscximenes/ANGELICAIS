import { ThemePreview, type ThemePreviewColors } from "@/components/ui/theme-preview"
import type { PaletteId } from "@/lib/theme/palettes"

// Tokens claros de cada paleta (src/app/palettes/*.css) — a miniatura
// acompanha a paleta ativa pra ser fiel ao que o site vai mostrar.
export const LIGHT_PREVIEW: Record<PaletteId, ThemePreviewColors> = {
  vercel: {
    window: "oklch(0.965 0 0)", // --sidebar-nav
    content: "oklch(0.99 0 0)", // --background
    dot: "oklch(0.44 0 0)", // --muted-foreground
    navItem: "oklch(0.92 0 0)", // --border
    navActive: "oklch(1 0 0)", // --card
    navMuted: "oklch(0.94 0 0)", // --secondary
    textStrong: "oklch(0 0 0)", // --foreground
    textMuted: "oklch(0.85 0 0)",
    block: "oklch(0.94 0 0)",
    accent: "oklch(0.44 0 0)",
    shadeOpacity: 0.04,
  },
  "claude-amber": {
    window: "#EEEDE6",
    content: "#FAF9F5",
    dot: "#6E6D68",
    navItem: "#DAD9D4",
    navActive: "#FAF9F5",
    navMuted: "#E9E6DC",
    textStrong: "#3D3929",
    textMuted: "#DAD9D4",
    block: "#EDE9DE",
    accent: "#C96442",
    shadeOpacity: 0.04,
  },
  "sage-garden": {
    window: "#F3F2EE",
    content: "#F8F7F4",
    dot: "#6B7280",
    navItem: "#E8E6E1",
    navActive: "#F8F7F4",
    navMuted: "#E8E6E1",
    textStrong: "#1A1F2E",
    textMuted: "#E8E6E1",
    block: "#FFFFFF",
    accent: "#7C9082",
    shadeOpacity: 0.04,
  },
}

export const LightTheme = ({ palette }: { palette: PaletteId }) => (
  <ThemePreview colors={LIGHT_PREVIEW[palette]} />
)
