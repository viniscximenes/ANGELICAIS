"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ClearActionResult =
  | { success: true }
  | { success: false; error: string };

interface Props {
  action: () => Promise<ClearActionResult>;
}

export function ClearBaseButton({ action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const r = await action();
      if (r.success) {
        toast.success("Base limpa");
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
      className="elevation-2 text-muted-foreground hover:text-danger flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
      style={{ border: "1px solid var(--border)", fontSize: "12px" }}
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconTrash size={14} aria-hidden="true" />
      )}
      <span className="ds-mono-sm">Limpar base</span>
    </button>
  );
}
