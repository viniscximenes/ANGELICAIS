import { ThemePreview } from "@/components/ui/theme-preview"

// Tokens claros do Zen Linen (tema/kpi-operadores.css).
export const LightTheme = () => (
  <ThemePreview
    colors={{
      window: "#E9E4D8",
      content: "#F4EFE4",
      dot: "#A89F8F",
      navItem: "#D8D2C4",
      navActive: "#F4EFE4",
      navMuted: "#DFD9CC",
      textStrong: "#2E2E2E",
      textMuted: "#CFC8B8",
      block: "#D8D2C4",
      accent: "#A89F8F",
      shadeOpacity: 0.04,
    }}
  />
)
