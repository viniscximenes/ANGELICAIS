"use client";

import { useTransition } from "react";
import { IconLoader2, IconUserCog } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateUserRoleAction } from "@/lib/users/actions/update-user-role-action";
import type { UserProfile } from "@/lib/users/types";

interface Props {
  user: UserProfile;
}

export function ChangeRoleButton({ user }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (user.role !== "OP" && user.role !== "AUX") return null;

  const newRole = user.role === "OP" ? "AUX" : "OP";
  const impactos =
    user.role === "OP"
      ? "Vai ganhar acesso a Monitoria e Diário de Bordo."
      : "Vai perder acesso a Monitoria e Diário de Bordo.";

  function handleClick() {
    if (
      !confirm(
        `Alterar role de ${user.fullName}?\n\n` +
          `Role atual: ${user.role}\n` +
          `Nova role: ${newRole}\n\n` +
          impactos,
      )
    )
      return;

    startTransition(async () => {
      const r = await updateUserRoleAction({
        id: user.id,
        newRole,
      });

      if (r.success) {
        toast.success(`Role alterada para ${newRole}`);
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
      className="text-muted-foreground hover:text-foreground elevation-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors"
      style={{ border: "1px solid var(--border)", fontSize: "12px" }}
    >
      {isPending ? (
        <IconLoader2
          size={14}
          className="shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <IconUserCog size={14} className="shrink-0" aria-hidden="true" />
      )}
      <span className="ds-mono-sm">→ {newRole}</span>
    </button>
  );
}
