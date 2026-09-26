"use client";

import { useState } from "react";
import { IconClipboardText } from "@tabler/icons-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { JustificativaPadrao } from "@/lib/equipe/diario/get-justificativas-padrao";

interface PresetsJustificativaButtonProps {
  opcoes: JustificativaPadrao[];
  onEscolher: (texto: string) => void;
  fontVariableClassName: string;
}

export function PresetsJustificativaButton({
  opcoes,
  onEscolher,
  fontVariableClassName,
}: PresetsJustificativaButtonProps) {
  const [open, setOpen] = useState(false);

  if (opcoes.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Preencher justificativa"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border/80 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <IconClipboardText size={15} aria-hidden="true" />
              </button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent
            side="top"
            sideOffset={7}
            className={`operacao-diario-portal ${fontVariableClassName}`}
          >
            Preencher justificativa
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="end"
        className={`operacao-diario-portal ${fontVariableClassName} w-80 gap-1 border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--kpi-shadow)]`}
      >
        <span className="block px-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preencher justificativa
        </span>
        {opcoes.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            onClick={() => {
              onEscolher(opcao.texto);
              setOpen(false);
            }}
            className="w-full cursor-pointer rounded-md px-2 py-2 text-left text-sm leading-relaxed outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            {opcao.texto}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
