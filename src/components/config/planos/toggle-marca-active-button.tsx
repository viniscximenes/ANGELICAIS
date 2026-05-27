"use client";

import { useTransition } from "react";
import {
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateMarcaAction } from "@/lib/config/planos/actions/update-marca-action";
import type { Marca } from "@/lib/config/planos/types";

interface Props {
  marca: Marca;
}

export function ToggleMarcaActiveButton({ marca }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const action = marca.isActive ? "desativar" : "ativar";
    if (!confirm(`${action[0].toUpperCase() + action.slice(1)} ${marca.nome}?`))
      return;

    startTransition(async () => {
      const r = await updateMarcaAction({
        id: marca.id,
        isActive: !marca.isActive,
      });
      if (r.success) {
        toast.success(marca.isActive ? "Marca desativada" : "Marca ativada");
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
      className="elevation-2 rounded-md p-1.5 transition-colors"
      style={{
        border: "1px solid var(--border)",
        color: marca.isActive ? "var(--danger)" : "var(--success)",
      }}
      aria-label={marca.isActive ? "Desativar marca" : "Ativar marca"}
      title={marca.isActive ? "Desativar" : "Ativar"}
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : marca.isActive ? (
        <IconPlayerPause size={14} aria-hidden="true" />
      ) : (
        <IconPlayerPlay size={14} aria-hidden="true" />
      )}
    </button>
  );
}
