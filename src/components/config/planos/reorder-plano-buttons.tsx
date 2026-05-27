"use client";

import { useTransition } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updatePlanoAction } from "@/lib/config/planos/actions/update-plano-action";
import type { PlanoWithMarca } from "@/lib/config/planos/types";

interface Props {
  plano: PlanoWithMarca;
  isFirst: boolean;
  isLast: boolean;
}

export function ReorderPlanoButtons({ plano, isFirst, isLast }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    const newOrdem =
      direction === "up" ? plano.ordem - 1 : plano.ordem + 1;

    startTransition(async () => {
      // Implementação simples — swap só do alvo (não re-numera todos).
      const r = await updatePlanoAction({ id: plano.id, ordem: newOrdem });
      if (r.success) {
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={isPending || isFirst}
        className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Subir"
      >
        <IconChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={isPending || isLast}
        className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Descer"
      >
        <IconChevronDown size={14} />
      </button>
    </div>
  );
}
