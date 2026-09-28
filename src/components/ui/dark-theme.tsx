import { ThemePreview } from "@/components/ui/theme-preview"

// Tokens escuros do Zen Linen (tema/kpi-operadores.css).
export const DarkTheme = () => (
  <ThemePreview
    colors={{
      window: "#101010",
      content: "#1C1C1C",
      dot: "#5C5A56",
      navItem: "#2A2A2A",
      navActive: "#363636",
      navMuted: "#1C1C1C",
      textStrong: "#D1CFC0",
      textMuted: "#5C5A56",
      block: "#2C2C2C",
      accent: "#8E8A83",
      shadeOpacity: 0.32,
    }}
  />
)
