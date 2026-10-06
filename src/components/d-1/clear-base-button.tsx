"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HoldButton } from "@/components/ui/hold-button";
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
   * Classe extra aplicada aos toasts (sonner) desta ação — ex.
   * "reports-tma-peso-toast", pra herdar o tema da rota sem tocar no
   * <Toaster/> global. Default: undefined.
   */
  toastClassName?: string;
  /** Toast "Base limpa" ao concluir. Default true. */
  showSuccessToast?: boolean;
}

/**
 * Botão "Limpar Base" com confirmação por pressão contínua (Hold Button do
 * React Bits): ícone-only em repouso, expande horizontalmente revelando
 * "Limpar Base" e só executa a ação após a pressão completar. Usado por
 * TMA, Pausas e o Consolidado do coordenador. (/s/reports/consolidado e
 * /s/reports/tempo-indisponibilidade usam LimparBaseExpandButton.)
 */
export function ClearBaseButton({
  action,
  onCleared,
  toastClassName,
  showSuccessToast = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const r = await action();
        if (r.success) {
          if (showSuccessToast) {
            toast.success("Base limpa", { className: toastClassName });
          }
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

  return (
    <HoldButton
      disabled={isPending}
      ariaLabel="Segure para limpar a base"
      icon={<IconTrash size={15} aria-hidden="true" />}
      doneIcon={<IconLoader2 size={15} className="animate-spin" aria-hidden="true" />}
      doneLabel="Limpando..."
      fillColor="var(--seg-thumb)"
      fillTextColor="var(--seg-text-active)"
      textColor="var(--muted-foreground)"
      holdTime={1600}
      releaseTime={200}
      resetAfter={1200}
      expandedWidth={116}
      onHold={handleClick}
      className="font-sans border border-border"
    >
      Limpar Base
    </HoldButton>
  );
}
