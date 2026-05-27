"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteRegraAction } from "@/lib/config/planos/actions/delete-regra-action";
import type { RegraDesconto } from "@/lib/config/planos/types";

interface Props {
  regra: RegraDesconto;
}

export function DeleteRegraButton({ regra }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm("Apagar esta regra?\n\nEsta ação não pode ser desfeita.")
    )
      return;

    startTransition(async () => {
      const r = await deleteRegraAction(regra.id);
      if (r.success) {
        toast.success("Regra apagada");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="elevation-2 text-muted-foreground hover:text-danger rounded-md p-1.5 transition-colors"
      style={{ border: "1px solid var(--border)" }}
      aria-label="Apagar regra"
      title="Apagar"
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconTrash size={14} aria-hidden="true" />
      )}
    </button>
  );
}
