"use client";

import { useState } from "react";
import { IconClipboardText } from "@tabler/icons-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { JustificativaPadrao } from "@/lib/equipe/diario/get-justificativas-padrao";

/**
 * Menu de textos prontos para o campo de justificativa (uma instância por
 * linha de Tempo Logado). Escolher um item substitui o conteúdo atual do
 * campo — que continua editável livremente depois.
 */
interface PresetsJustificativaButtonProps {
  opcoes: JustificativaPadrao[];
  onEscolher: (texto: string) => void;
}

export function PresetsJustificativaButton({
  opcoes,
  onEscolher,
}: PresetsJustificativaButtonProps) {
  const [open, setOpen] = useState(false);

  if (opcoes.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Preencher justificativa"
          title="Preencher justificativa"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors"
        >
          <IconClipboardText size={14} aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 gap-1 p-1.5">
        <span className="text-muted-foreground px-1.5 py-1 text-[11px] font-semibold tracking-wider uppercase">
          Preencher justificativa
        </span>
        {opcoes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onEscolher(o.texto);
              setOpen(false);
            }}
            className="hover:bg-muted focus:bg-muted ds-small cursor-pointer rounded-md px-2 py-1.5 text-left leading-relaxed transition-colors outline-none"
          >
            {o.texto}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
