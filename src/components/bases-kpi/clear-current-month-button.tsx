"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { clearCurrentMonthAction } from "@/lib/kpi/bases/clear-current-month-action";
import { formatMonthLabel, getCurrentMonthRef } from "@/lib/kpi/bases/format-date";

export function ClearCurrentMonthButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const monthLabel = formatMonthLabel(getCurrentMonthRef()).replace(" / ", " ");

  function handleConfirm() {
    startTransition(async () => {
      const result = await clearCurrentMonthAction();
      setOpen(false);

      if (result.success) {
        toast.success("Mês atual apagado", {
          description: `${result.rowsDeleted} registros removidos`,
        });
        router.refresh();
      } else {
        toast.error("Não foi possível apagar", { description: result.error });
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {isPending ? (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <IconTrash size={14} aria-hidden="true" />
          )}
          Limpar {monthLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar dados de {monthLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso apagará todos os dados de KPI do mês atual (operadores e
            supervisores). Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Apagando..." : "Apagar mesmo assim"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
