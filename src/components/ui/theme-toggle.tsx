"use client"

import * as React from "react"
import { motion } from "motion/react"
import { IconCheck, IconChevronDown, IconPalette } from "@tabler/icons-react"

import { useTheme, type Theme } from "@/components/dashboard/theme-provider"
import { DarkTheme } from "@/components/ui/dark-theme"
import { LightTheme } from "@/components/ui/light-theme"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PALETTES } from "@/lib/theme/palettes"
import { cn } from "@/lib/utils"

interface ModeOption {
  value: Theme
  label: string
  icon: React.ComponentType
}

const modes: ModeOption[] = [
  { value: "light", label: "Claro", icon: LightTheme },
  { value: "dark", label: "Escuro", icon: DarkTheme },
]

const tileClass =
  "relative flex items-end justify-center rounded-md border border-border px-1.5 pt-3 transition"
const selectedTileClass = "border-primary ring-2 ring-primary/25"

function TileLabel({
  children,
  selected,
}: {
  children: React.ReactNode
  selected: boolean
}) {
  return (
    <span className="absolute inset-x-0 bottom-2 flex justify-center sm:-bottom-1">
      <span className="relative">
        <span className="bg-background text-foreground ring-border relative inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md px-3 text-[13px] leading-none font-semibold shadow-sm ring-1 select-none">
          {children}
        </span>
        {selected && (
          <motion.span
            className="bg-primary absolute inset-x-1.5 -bottom-3 h-0.5 rounded-full max-sm:hidden"
            layoutId="activeThemeTile"
          />
        )}
      </span>
    </span>
  )
}

function PaletteSwatches({ swatches }: { swatches: readonly string[] }) {
  return (
    <span className="flex aspect-[177/140] w-full max-w-[177px] overflow-hidden">
      {swatches.map((color) => (
        <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
      ))}
    </span>
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, palette, setPalette, isPending, isTransitioning } =
    useTheme()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const isBusy = isPending || isTransitioning
  const current = PALETTES.find((p) => p.id === palette) ?? PALETTES[0]

  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative flex w-full flex-col rounded-lg border border-border",
        className,
      )}
    >
      <div className="px-3 pt-3 text-base font-medium">Tema</div>
      <p className="text-muted-foreground mt-0.5 px-3 text-sm">
        Escolha o modo e a paleta de cores da interface
      </p>
      <div className="bg-border my-3 h-px w-full" />

      <div className="p-6 pt-3">
        <div className="grid gap-3 max-sm:space-y-3 sm:grid-cols-3">
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as Theme)}
            disabled={isBusy}
            className="contents"
            aria-label="Modo de cor"
          >
            {modes.map((mode) => {
              const Icon = mode.icon
              const selected = theme === mode.value
              return (
                <div
                  key={mode.value}
                  className={cn(
                    tileClass,
                    mode.value === "light" ? "bg-[#E9E4D8]" : "bg-[#1C1C1C]",
                    selected && selectedTileClass,
                  )}
                >
                  <RadioGroupItem
                    value={mode.value}
                    id={`theme-mode-${mode.value}`}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`theme-mode-${mode.value}`}
                    className={cn(
                      "relative cursor-pointer rounded-t-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      isBusy && "cursor-wait",
                    )}
                  >
                    <span className="block overflow-hidden rounded-t-sm border border-b-0 border-black/10 shadow-xl shadow-black/20">
                      <Icon />
                    </span>
                    <TileLabel selected={selected}>{mode.label}</TileLabel>
                  </label>
                </div>
              )
            })}
          </RadioGroup>

          {/* Terceiro card: seletor de paleta (hoje só Zen Linen). */}
          <button
            type="button"
            onClick={() => setPaletteOpen((o) => !o)}
            aria-expanded={paletteOpen}
            aria-controls="theme-palette-list"
            className={cn(
              tileClass,
              "bg-muted cursor-pointer focus-visible:ring-ring outline-none focus-visible:ring-2",
              paletteOpen && "border-foreground/40",
            )}
          >
            <span className="relative block w-full">
              <span className="flex justify-center overflow-hidden rounded-t-sm border border-b-0 border-black/10 shadow-xl shadow-black/20">
                <PaletteSwatches swatches={current.swatches} />
              </span>
              <TileLabel selected={false}>
                <IconPalette size={14} aria-hidden="true" />
                {current.label}
                <IconChevronDown
                  size={14}
                  aria-hidden="true"
                  className={cn("transition-transform", paletteOpen && "rotate-180")}
                />
              </TileLabel>
            </span>
          </button>
        </div>

        {paletteOpen && (
          <div id="theme-palette-list" className="mt-6 flex flex-col gap-1.5">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Paletas
            </div>
            <RadioGroup
              value={palette}
              onValueChange={(value) => setPalette(value as typeof palette)}
              className="gap-1.5"
              aria-label="Paleta de cores"
            >
              {PALETTES.map((p) => {
                const selected = p.id === palette
                return (
                  <label
                    key={p.id}
                    className={cn(
                      "hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors",
                      selected && "border-primary/60 bg-muted/40",
                    )}
                  >
                    <RadioGroupItem value={p.id} className="sr-only" />
                    <span className="flex h-5 w-12 shrink-0 overflow-hidden rounded-sm ring-1 ring-black/10">
                      {p.swatches.map((color) => (
                        <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {p.description}
                      </span>
                    </span>
                    {selected && (
                      <IconCheck size={16} className="text-primary" aria-hidden="true" />
                    )}
                  </label>
                )
              })}
            </RadioGroup>
            <p className="text-muted-foreground text-xs">Novas paletas em breve.</p>
          </div>
        )}
      </div>
    </div>
  )
}
