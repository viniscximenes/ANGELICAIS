"use client";

import { useTransition } from "react";
import { IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleUserActiveAction } from "@/lib/users/actions/toggle-user-active-action";
import type { UserProfile } from "@/lib/users/types";

interface Props {
  user: UserProfile;
}

/**
 * Só reativa (usuário já inativo) — quem estava ativo agora usa "Deletar"
 * (delete-user-modal.tsx) em vez de desativar. Esse componente segue
 * existindo pra reativar contas que ficaram inativas antes dessa mudança.
 */
export function ToggleActiveButton({ user }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Ativar ${user.fullName}?\n\nEle voltará a conseguir fazer login normalmente.`)) {
      return;
    }

    startTransition(async () => {
      const r = await toggleUserActiveAction({
        id: user.id,
        newIsActive: true,
      });

      if (r.success) {
        toast.success("Usuário ativado");
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
      className="elevation-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
      style={{
        border: "1px solid var(--border)",
        fontSize: "12px",
        color: "var(--success)",
      }}
    >
      {isPending ? (
        <IconLoader2
          size={14}
          className="shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <IconPlayerPlay size={14} className="shrink-0" aria-hidden="true" />
      )}
      <span className="ds-mono-sm">Ativar</span>
    </button>
  );
}
