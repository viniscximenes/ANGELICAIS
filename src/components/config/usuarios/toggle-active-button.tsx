"use client";

import { useTransition } from "react";
import {
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleUserActiveAction } from "@/lib/users/actions/toggle-user-active-action";
import type { UserProfile } from "@/lib/users/types";

interface Props {
  user: UserProfile;
}

export function ToggleActiveButton({ user }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const action = user.isActive ? "desativar" : "ativar";
    const consequencia = user.isActive
      ? "Ele não conseguirá mais fazer login. Continua nos registros históricos."
      : "Ele voltará a conseguir fazer login normalmente.";

    if (
      !confirm(
        `${action[0].toUpperCase() + action.slice(1)} ${user.fullName}?\n\n${consequencia}`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const r = await toggleUserActiveAction({
        id: user.id,
        newIsActive: !user.isActive,
      });

      if (r.success) {
        toast.success(user.isActive ? "Usuário desativado" : "Usuário ativado");
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
      className="elevation-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors"
      style={{
        border: "1px solid var(--border)",
        fontSize: "12px",
        color: user.isActive ? "var(--danger)" : "var(--success)",
      }}
    >
      {isPending ? (
        <IconLoader2
          size={14}
          className="shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : user.isActive ? (
        <IconPlayerPause size={14} className="shrink-0" aria-hidden="true" />
      ) : (
        <IconPlayerPlay size={14} className="shrink-0" aria-hidden="true" />
      )}
      <span className="ds-mono-sm">
        {user.isActive ? "Desativar" : "Ativar"}
      </span>
    </button>
  );
}
