"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteDiaAction } from "@/lib/db/actions/delete-dia-action";
import type { DiaDisponivel } from "@/lib/db/types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

interface DiasSalvosListProps {
  dias: DiaDisponivel[];
}

export function DiasSalvosList({ dias }: DiasSalvosListProps) {
  if (dias.length === 0) {
    return (
      <p className="ds-small text-muted-foreground">
        Nenhum dia salvo ainda. Suba o primeiro CSV acima.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {dias.map((dia) => (
        <DiaRow key={dia.dataRef} dia={dia} />
      ))}
    </div>
  );
}

function DiaRow({ dia }: { dia: DiaDisponivel }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDiaAction(dia.dataRef);

      if (result.success) {
        toast.success(`Dia ${formatDateBR(dia.dataRef)} apagado`);
        router.refresh();
      } else {
        toast.error("Não foi possível apagar", { description: result.error });
      }
    });
  }

  return (
    <div className="elevation-1 flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <span className="ds-mono font-semibold text-sm text-foreground">
          {formatDateBR(dia.dataRef)}
        </span>
        <span className="ds-mono-sm text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
          {dia.linhas.toLocaleString("pt-BR")} linhas
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Apagar dia ${formatDateBR(dia.dataRef)}`}
        onClick={handleDelete}
        disabled={isPending}
        className="text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
      >
        {isPending ? (
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <IconTrash size={14} aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
