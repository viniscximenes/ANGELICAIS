"use client";

import { useTransition } from "react";
import {
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { togglePlanoActiveAction } from "@/lib/config/planos/actions/toggle-plano-active-action";
import type { PlanoWithMarca } from "@/lib/config/planos/types";

interface Props {
  plano: PlanoWithMarca;
}

export function TogglePlanoActiveButton({ plano }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const action = plano.isActive ? "desativar" : "ativar";
    if (!confirm(`${action[0].toUpperCase() + action.slice(1)} ${plano.nome}?`))
      return;

    startTransition(async () => {
      const r = await togglePlanoActiveAction(plano.id, !plano.isActive);
      if (r.success) {
        toast.success(plano.isActive ? "Plano desativado" : "Plano ativado");
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
        color: plano.isActive ? "var(--danger)" : "var(--success)",
      }}
      aria-label={plano.isActive ? "Desativar plano" : "Ativar plano"}
      title={plano.isActive ? "Desativar" : "Ativar"}
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : plano.isActive ? (
        <IconPlayerPause size={14} aria-hidden="true" />
      ) : (
        <IconPlayerPlay size={14} aria-hidden="true" />
      )}
    </button>
  );
}
