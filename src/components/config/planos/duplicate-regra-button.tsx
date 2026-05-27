"use client";

import { useTransition } from "react";
import { IconCopy, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { duplicateRegraAction } from "@/lib/config/planos/actions/duplicate-regra-action";
import type { RegraDesconto } from "@/lib/config/planos/types";

interface Props {
  regra: RegraDesconto;
}

export function DuplicateRegraButton({ regra }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const r = await duplicateRegraAction(regra.id);
      if (r.success) {
        toast.success("Regra duplicada");
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
      className="elevation-2 text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
      style={{ border: "1px solid var(--border)" }}
      aria-label="Duplicar regra"
      title="Duplicar"
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconCopy size={14} aria-hidden="true" />
      )}
    </button>
  );
}
