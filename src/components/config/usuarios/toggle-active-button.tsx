"use client";

import { useTransition } from "react";
import { IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HoldButton } from "@/components/ui/hold-button";
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

  // Mesmo Hold Button do "Limpar Base" do Consolidado no lugar do confirm():
  // segurar expande, revela "Ativar" e só ativa ao completar a pressão.
  return (
    <HoldButton
      disabled={isPending}
      ariaLabel={`Segure para ativar ${user.fullName}`}
      icon={<IconPlayerPlay size={15} aria-hidden="true" />}
      doneIcon={<IconLoader2 size={15} className="animate-spin" aria-hidden="true" />}
      doneLabel="Ativando..."
      fillColor="var(--seg-thumb)"
      fillTextColor="var(--seg-text-active)"
      textColor="var(--success)"
      holdTime={1600}
      releaseTime={200}
      resetAfter={1200}
      expandedWidth={104}
      onHold={handleClick}
      className="config-usuarios-ativar font-sans border border-border"
    >
      Ativar
    </HoldButton>
  );
}
