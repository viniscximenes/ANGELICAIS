"use client";

import { useEffect, useState } from "react";
import { IconChevronDown, IconMoon, IconSun } from "@tabler/icons-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PALETTES } from "@/lib/theme/palettes";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

// Marca que o usuário já abriu o menu de tema — até lá o botão mostra um
// ponto discreto para chamar atenção para a personalização.
const DISCOVERED_KEY = "theme-menu-discovered";

/**
 * Botão de tema da barra superior: abre o card de tema (modo claro/escuro +
 * paleta). O conteúdo vai em portal para <body>, por isso recebe o próprio
 * data-nav-theme="zen-linen" (ver nav-zen-linen.css).
 */
export function ThemeMenu() {
  const { theme, palette } = useTheme();
  const [open, setOpen] = useState(false);
  // Começa "descoberto" para não piscar o destaque em quem já conhece o botão.
  const [discovered, setDiscovered] = useState(true);
  const paletteLabel =
    PALETTES.find((p) => p.id === palette)?.label ?? PALETTES[0].label;

  useEffect(() => {
    try {
      setDiscovered(localStorage.getItem(DISCOVERED_KEY) === "1");
    } catch {}
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !discovered) {
      setDiscovered(true);
      try {
        localStorage.setItem(DISCOVERED_KEY, "1");
      } catch {}
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Personalizar tema"
          className={cn(
            // Claro: fundo do conteúdo + borda/sombra sutis pra destacar do header
            // (o header claro é um tom abaixo). Escuro: só borda, já contrasta.
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring border-border bg-background hover:bg-background/70 relative flex h-9 items-center gap-2 rounded-lg border pr-2.5 pl-3 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors duration-150 outline-none focus-visible:ring-2 dark:border-[var(--sidebar-border)] dark:bg-transparent dark:shadow-none dark:hover:bg-foreground/[0.04]",
            open && "text-foreground dark:bg-foreground/[0.06]",
          )}
        >
          {/* Ícone do modo atual, em traço fino como o resto da navegação. */}
          {theme === "dark" ? (
            <IconMoon size={16} stroke={1.75} aria-hidden="true" className="shrink-0" />
          ) : (
            <IconSun size={16} stroke={1.75} aria-hidden="true" className="shrink-0" />
          )}

          <span>Tema</span>
          <span aria-hidden="true" className="bg-[var(--sidebar-border)] h-3.5 w-px" />
          <span>{paletteLabel}</span>

          <IconChevronDown
            size={14}
            stroke={1.75}
            aria-hidden="true"
            className={cn(
              "shrink-0 opacity-60 transition-transform duration-200",
              open && "rotate-180",
            )}
          />

          {/* Destaque discreto até o primeiro uso (antes: ping + selo "Novo"). */}
          {!discovered && (
            <span
              aria-hidden="true"
              className="bg-foreground absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-[var(--sidebar-nav)]"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-nav-theme="zen-linen"
        align="end"
        sideOffset={10}
        className="w-[min(600px,calc(100vw-2rem))] p-0 ring-0"
      >
        <ThemeToggle className="border-0" />
      </PopoverContent>
    </Popover>
  );
}
