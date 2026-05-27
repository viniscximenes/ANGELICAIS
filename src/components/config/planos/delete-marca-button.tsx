"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteMarcaAction } from "@/lib/config/planos/actions/delete-marca-action";
import type { Marca } from "@/lib/config/planos/types";

interface Props {
  marca: Marca;
}

export function DeleteMarcaButton({ marca }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        `Apagar a marca ${marca.nome}?\n\nEsta ação não pode ser desfeita.`,
      )
    )
      return;

    startTransition(async () => {
      const r = await deleteMarcaAction(marca.id);
      if (r.success) {
        toast.success("Marca apagada");
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
      aria-label="Apagar marca"
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
