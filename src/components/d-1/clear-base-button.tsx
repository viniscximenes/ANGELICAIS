"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
}

export function ClearBaseButton({ action, onCleared }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const r = await action();
        if (r.success) {
          toast.success("Base limpa");
          await onCleared?.();
          router.refresh();
        } else {
          toast.error(r.error);
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao limpar a base");
        console.error("[ClearBaseButton] erro:", err);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-destructive text-destructive-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
      style={{ fontSize: "12px" }}
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconTrash size={14} aria-hidden="true" />
      )}
      <span className="ds-mono-sm">Limpar base</span>
    </button>
  );
}
