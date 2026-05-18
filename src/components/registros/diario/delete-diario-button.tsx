"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteDiarioAction } from "@/lib/diario/actions/delete-diario-action";

interface Props {
  id: string;
}

export function DeleteDiarioButton({ id }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm("Apagar este registro?\n\nEsta ação não pode ser desfeita.")
    ) {
      return;
    }

    startTransition(async () => {
      const r = await deleteDiarioAction(id);
      if (r.success) {
        toast.success("Registro apagado");
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
      className="text-muted-foreground hover:text-danger rounded-md p-1.5 transition-colors"
      aria-label="Apagar registro"
      title="Apagar registro"
    >
      {isPending ? (
        <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconTrash size={16} aria-hidden="true" />
      )}
    </button>
  );
}
