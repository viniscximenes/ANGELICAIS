import { colorCaso, labelCaso } from "@/lib/diario/caso-labels";
import type { DiarioCaso } from "@/lib/diario/types";

interface Props {
  caso: DiarioCaso;
  size?: "sm" | "md";
}

export function CasoBadge({ caso, size = "md" }: Props) {
  const color = colorCaso(caso);
  const label = labelCaso(caso);

  return (
    <span
      className={`inline-flex items-center rounded-full ${
        size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
      }`}
      style={{
        background: `color-mix(in oklch, ${color} 15%, transparent)`,
        color: color,
        border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
        fontSize: size === "sm" ? "10px" : "11px",
        fontFamily: "var(--font-geist-mono)",
      }}
    >
      {label}
    </span>
  );
}
