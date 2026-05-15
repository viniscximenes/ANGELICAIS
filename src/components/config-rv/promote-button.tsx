"use client";

import { useTransition } from "react";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { promoteCurrentToPreviousAction } from "@/lib/rv/actions/promote-current-to-previous";

export function PromoteButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "Promover regras atuais para passadas?\n\nAs regras passadas atuais serão sobrescritas. Esta ação é útil ao virar o mês.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const r = await promoteCurrentToPreviousAction();
      if (r.success) {
        toast.success("Regras promovidas com sucesso");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className="gap-2"
    >
      {isPending ? (
        <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconArrowRight size={16} aria-hidden="true" />
      )}
      {isPending ? "Promovendo..." : "Promover atual → passado"}
    </Button>
  );
}
