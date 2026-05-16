"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteMonitoriaAction } from "@/lib/monitorias/actions/delete-monitoria-action";

interface Props {
  id: string;
  operatorName: string | null;
}

export function DeleteMonitoriaButton({ id, operatorName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const nome = operatorName ?? "este operador";
    if (
      !confirm(
        `Apagar monitoria de ${nome}?\n\nEsta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const r = await deleteMonitoriaAction(id);
      if (r.success) {
        toast.success("Monitoria apagada");
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
      aria-label="Apagar monitoria"
      title="Apagar monitoria"
    >
      {isPending ? (
        <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconTrash size={16} aria-hidden="true" />
      )}
    </button>
  );
}
