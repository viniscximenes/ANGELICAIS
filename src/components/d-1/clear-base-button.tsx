"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

type ClearActionResult =
  | { success: true }
  | { success: false; error: string };

interface Props {
  action: () => Promise<ClearActionResult>;
  /**
   * Chamado após um clear bem-sucedido, ANTES do router.refresh(). Os
   * componentes que renderizam este botão guardam os dados da tabela em
   * useState (inicializado só uma vez a partir das props) pro polling de
   * 30s funcionar — router.refresh() sozinho não re-sincroniza esse estado
   * (React não rereseta useState quando as props do componente mudam), daí
   * a tela ficar com dado antigo até o próximo poll ou um F5. onCleared
   * deixa o componente pai refazer o mesmo refetch do polling na hora.
   */
  onCleared?: () => void | Promise<void>;
  /**
   * "default" (padrão, usado por TMA/Pausas — NÃO alterado) = pílula
   * compacta py-1.5/12px de sempre. "compact" (só usado pelo
   * /reports/consolidado até a 4ª rodada) = mesma família visual (h-8,
   * text-sm, rounded-md) dos demais controles outline daquela página,
   * mantendo o preenchimento destructive sólido (cor de alerta) pra não se
   * confundir com uma ação neutra. "icon-danger" (5ª rodada, /reports/
   * consolidado e /reports/tempo-indisponibilidade) = ícone-only, MESMO
   * visual (outline neutro, h-8 w-8, border-border) do botão de engrenagem
   * (ConfigTabelaPopover/ConfigTabelaTempoIndispPopover) — não é preenchido
   * nem vermelho, só o ícone de lixeira muda; rótulo "Limpar base" vira
   * aria-label + tooltip (Radix Tooltip, mesmo padrão visual do tema já
   * usado em export-popup-png-button.tsx) em vez de texto visível.
   */
  variant?: "default" | "compact" | "icon-danger";
  /**
   * Classe extra aplicada aos toasts (sonner) desta ação — ex.
   * "reports-consolidado-toast", pra herdar o tema Zen Linen só nos toasts
   * disparados a partir do /reports/consolidado, sem tocar no <Toaster/>
   * global nem nos toasts de TMA/Tempo Indisponibilidade (que não passam
   * essa prop e continuam com o visual padrão). Default: undefined.
   */
  toastClassName?: string;
}

export function ClearBaseButton({ action, onCleared, variant = "default", toastClassName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const r = await action();
        if (r.success) {
          toast.success("Base limpa", { className: toastClassName });
          await onCleared?.();
          router.refresh();
        } else {
          toast.error(r.error, { className: toastClassName });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao limpar a base", { className: toastClassName });
        console.error("[ClearBaseButton] erro:", err);
      }
    });
  }

  if (variant === "icon-danger") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              disabled={isPending}
              aria-label="Limpar base"
              title="Limpar base"
              // Mesma família visual do botão de engrenagem
              // (ConfigTabelaPopover): outline h-8/w-8, sem preenchimento —
              // só o ícone muda (lixeira). Não usa cor destructive de
              // propósito (pedido explícito: mesmo visual neutro do botão de
              // config, não vermelho/preenchido).
              className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
            >
              {isPending ? (
                <IconLoader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconTrash size={15} aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Limpar base</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        variant === "compact"
          ? "font-sans inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground outline-none transition-opacity hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          : "bg-destructive text-destructive-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-opacity cursor-pointer shadow-sm disabled:opacity-50",
      )}
      style={variant === "compact" ? undefined : { fontSize: "12px" }}
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconTrash size={14} aria-hidden="true" />
      )}
      <span className={variant === "compact" ? undefined : "ds-mono-sm"}>Limpar base</span>
    </button>
  );
}
