"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyTextoButtonProps {
  getTexto: () => string;
  fontVariableClassName: string;
}

export function CopyTextoButton({
  getTexto,
  fontVariableClassName,
}: CopyTextoButtonProps) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopy() {
    const texto = getTexto();

    try {
      try {
        await navigator.clipboard.writeText(texto);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = texto;
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!success) throw new Error("Clipboard indisponível");
      }

      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o report", {
        className: "operacao-diario-toast",
      });
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copiado ? "Report copiado" : "Copiar report"}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border/80 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {copiado ? (
              <IconCheck
                size={15}
                style={{ color: "var(--success)" }}
                aria-hidden="true"
              />
            ) : (
              <IconCopy size={15} aria-hidden="true" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={7}
          className={`operacao-diario-portal ${fontVariableClassName}`}
        >
          {copiado ? "Copiado" : "Copiar report"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
