"use client";

import { useEffect, useState } from "react";
import { IconMoonFilled, IconSunFilled } from "@tabler/icons-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PALETTES } from "@/lib/theme/palettes";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

// Marca que o usuário já abriu o menu de tema — até lá o botão pulsa e
// mostra o selo "Novo" para chamar atenção para a personalização.
const DISCOVERED_KEY = "theme-menu-discovered";

/**
 * Botão de tema da barra superior: abre o card de tema (modo claro/escuro +
 * paleta). O conteúdo vai em portal para <body>, por isso recebe o próprio
 * data-nav-theme="zen-linen" (ver nav-zen-linen.css).
 */
export function ThemeMenu() {
  const { theme, palette, isPending, isTransitioning } = useTheme();
  const [open, setOpen] = useState(false);
  // Começa "descoberto" para não piscar o destaque em quem já conhece o botão.
  const [discovered, setDiscovered] = useState(true);
  const isBusy = isPending || isTransitioning;
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
            "group border-border bg-card/70 hover:bg-card focus-visible:ring-ring relative flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 outline-none hover:shadow-md focus-visible:ring-2",
            open && "bg-card shadow-md",
          )}
        >
          <span className="relative flex size-7 shrink-0 items-center justify-center">
            {!discovered && (
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-ping rounded-full bg-[#A89F8F]/50"
              />
            )}
            {/* Orbe dividido claro/escuro: gira ao passar o mouse, com o
                lado do modo atual virado para cima. */}
            <span
              aria-hidden="true"
              className={cn(
                "relative size-7 overflow-hidden rounded-full shadow-inner ring-1 ring-black/15 transition-transform duration-500 ease-out group-hover:rotate-180",
                theme === "dark" && "rotate-180 group-hover:rotate-0",
                open && (theme === "dark" ? "rotate-0" : "rotate-180"),
                isBusy && "animate-spin",
              )}
              style={{
                background:
                  "linear-gradient(135deg, #F4EFE4 0 50%, #2E2E2E 50% 100%)",
              }}
            >
              <IconSunFilled
                size={10}
                className="absolute top-[5px] left-[5px] text-[#A89F8F]"
              />
              <IconMoonFilled
                size={10}
                className="absolute right-[5px] bottom-[5px] text-[#D8D2C4]"
              />
            </span>
          </span>

          <span className="flex flex-col items-start leading-none">
            <span className="text-foreground text-[12px] font-semibold">
              Tema
            </span>
            <span className="text-muted-foreground mt-0.5 text-[10px] tracking-wide">
              {paletteLabel}
            </span>
          </span>

          {!discovered && (
            <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-wide uppercase shadow-sm">
              Novo
            </span>
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
