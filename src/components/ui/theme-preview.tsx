import * as React from "react"

/**
 * Miniatura de "janela" usada nos cards do seletor de tema. Mesmo desenho do
 * DarkTheme original (campsite), parametrizado por cores para servir aos
 * modos claro/escuro de cada paleta (ver dark-theme.tsx / light-theme.tsx).
 */
export interface ThemePreviewColors {
  window: string
  content: string
  dot: string
  navItem: string
  navActive: string
  navMuted: string
  textStrong: string
  textMuted: string
  block: string
  accent: string
  shadeOpacity: number
}

export function ThemePreview({ colors: c }: { colors: ThemePreviewColors }) {
  const id = React.useId().replace(/:/g, "")
  const textRow = (y: number, xs: [number, number][], fill: string) =>
    xs.map(([x, w]) => (
      <rect key={`${y}-${x}`} x={x} y={y} width={w} height="2" rx="1" fill={fill} />
    ))

  return (
    <svg
      width="177"
      height="140"
      viewBox="0 0 177 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-auto w-full max-w-[177px]"
      aria-hidden="true"
    >
      <g clipPath={`url(#clip-${id})`}>
        <rect width="177" height="162" rx="3" fill={c.window} />
        <path d="M44 0H174C175.657 0 177 1.34315 177 3V151H44V0Z" fill={c.content} />
        <circle cx="35" cy="8" r="4" fill={c.dot} />
        <circle cx="73" cy="40" r="4" fill={c.accent} />
        <rect x="5" y="5" width="22" height="6" rx="1" fill={c.navItem} />
        <rect x="5" y="16" width="34" height="6" rx="1" fill={c.navActive} />
        <rect x="5" y="26" width="34" height="6" rx="1" fill={c.navItem} />
        {[36, 46, 56].map((y) => (
          <rect key={y} x="5" y={y} width="34" height="6" rx="1" fill={c.navMuted} />
        ))}
        {textRow(37, [[81, 13], [96, 19]], c.textStrong)}
        {textRow(42, [[81, 8], [91, 15], [108, 6], [116, 12], [130, 9]], c.textMuted)}
        {textRow(
          47,
          [[69, 8], [79, 2], [83, 9], [94, 16], [112, 7], [121, 3], [126, 9], [137, 4], [143, 6]],
          c.textMuted,
        )}
        <rect x="69" y="53" width="84" height="47" rx="4" fill={c.block} />
        <rect
          width="177"
          height="140"
          fill={`url(#shade-${id})`}
          fillOpacity={c.shadeOpacity}
        />
      </g>
      <defs>
        <linearGradient
          id={`shade-${id}`}
          x1="88.5"
          y1="0"
          x2="88.5"
          y2="140"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.565789" stopOpacity="0" />
          <stop offset="1" />
        </linearGradient>
        <clipPath id={`clip-${id}`}>
          <rect width="177" height="140" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
