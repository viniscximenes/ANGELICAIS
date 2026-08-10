"use client";

import { useState } from "react";
import { IconCheck, IconDownload, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExportPopupPngButtonProps {
  /** Ref do wrapper offscreen (tema claro forçado) que será capturado. */
  contentRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  className?: string;
}

/**
 * Botão discreto (só ícone) que captura `contentRef` via `domToPng` e baixa
 * o resultado como arquivo PNG. Usado nos popups de detalhe do operador
 * (Consolidado e Tempo/Indisponibilidade) — cada um renderiza seu próprio
 * conteúdo offscreen em tema claro fixo para essa captura.
 */
export function ExportPopupPngButton({
  contentRef,
  filename,
  className,
}: ExportPopupPngButtonProps) {
  const [state, setState] = useState<"idle" | "gerando" | "feito">("idle");

  async function handleClick() {
    const target = contentRef.current;
    if (!target) {
      toast.error("Conteúdo não encontrado");
      return;
    }

    setState("gerando");

    try {
      const dataUrl = await domToPng(target, { scale: 2 });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setState("feito");
      toast.success("Imagem baixada");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[export-popup-png] erro:", err);
      setState("idle");
      toast.error("Não foi possível gerar a imagem");
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClick}
            disabled={state === "gerando"}
            className={className}
          >
            {state === "gerando" ? (
              <IconLoader2 className="animate-spin" aria-hidden="true" />
            ) : state === "feito" ? (
              <IconCheck style={{ color: "var(--success)" }} aria-hidden="true" />
            ) : (
              <IconDownload aria-hidden="true" />
            )}
            <span className="sr-only">Baixar como imagem</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Baixar como imagem</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
