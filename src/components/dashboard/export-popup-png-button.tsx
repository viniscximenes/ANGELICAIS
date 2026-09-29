"use client";

import { useState } from "react";
import { IconCheck, IconDownload, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";

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
  /**
   * Repassa `corDeFundoDoAlvo` pra `capturarComoPng`: resolve o --background
   * do padding a partir do próprio `contentRef`, em vez da raiz do
   * documento. Necessário quando `contentRef` vive dentro de um portal
   * (Radix Dialog) sob um tema ESCOPADO via atributo (ex:
   * [data-page="reports-consolidado"]) que a raiz do documento não carrega.
   * Padrão `false` — não muda o comportamento de nenhum uso existente
   * (ex: popup do TMA).
   */
  corDeFundoDoAlvo?: boolean;
  /**
   * Classe extra aplicada aos toasts (sonner) deste botão — ex.
   * "reports-consolidado-toast", pra herdar o tema Zen Linen só nos toasts
   * disparados a partir do /reports/consolidado, sem tocar no <Toaster/>
   * global nem nos toasts de TMA/Tempo Indisponibilidade (que não passam
   * essa prop e continuam com o visual padrão). Default: undefined.
   */
  toastClassName?: string;
  /**
   * Toast "Imagem baixada" ao concluir. Default true (comportamento de
   * sempre, TMA/Tempo Indisponibilidade). /reports/consolidado passa false:
   * o próprio botão já confirma (ícone ✓ por 2s). Erros continuam com toast.
   */
  showSuccessToast?: boolean;
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
  corDeFundoDoAlvo = false,
  toastClassName,
  showSuccessToast = true,
}: ExportPopupPngButtonProps) {
  const [state, setState] = useState<"idle" | "gerando" | "feito">("idle");

  async function handleClick() {
    const target = contentRef.current;
    if (!target) {
      toast.error("Conteúdo não encontrado", { className: toastClassName });
      return;
    }

    setState("gerando");

    try {
      const dataUrl = await capturarComoPng(target, { scale: 2, corDeFundoDoAlvo });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setState("feito");
      if (showSuccessToast) {
        toast.success("Imagem baixada", { className: toastClassName });
      }
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[export-popup-png] erro:", err);
      setState("idle");
      toast.error("Não foi possível gerar a imagem", { className: toastClassName });
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
