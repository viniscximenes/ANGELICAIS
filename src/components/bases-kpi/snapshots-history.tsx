"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StyledCard } from "@/components/gestor/styled-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteMonthAction } from "@/lib/kpi/bases/delete-month-action";
import {
  formatDateTimeBR,
  formatMonthLabel,
} from "@/lib/kpi/bases/format-date";
import type { MonthSummary } from "@/lib/kpi/bases/get-snapshots-summary";

interface SnapshotsHistoryProps {
  snapshots: MonthSummary[];
  type?: "operadores" | "gestores";
}

export function SnapshotsHistory({ snapshots, type = "operadores" }: SnapshotsHistoryProps) {
  const router = useRouter();
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(mesRef: string) {
    if (
      !confirm(
        `Tem certeza que deseja apagar todos os dados de ${formatMonthLabel(mesRef)}?\n\nEsta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setDeletingMonth(mesRef);

    startTransition(async () => {
      const result = await deleteMonthAction(mesRef);
      setDeletingMonth(null);

      if (result.success) {
        toast.success("Mês apagado", {
          description: `${result.rowsDeleted} registros removidos`,
        });
        router.refresh();
      } else {
        toast.error("Não foi possível apagar", { description: result.error });
      }
    });
  }

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Histórico
          </span>
          {snapshots.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground font-medium">
              {snapshots.length}
            </span>
          )}
        </div>
        <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
      </div>

      <StyledCard withGradient className="p-6 gap-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="ds-mono-sm text-muted-foreground px-3 py-3.5 font-semibold tracking-wider uppercase align-middle leading-none">
                Mês
              </TableHead>
              <TableHead className="ds-mono-sm text-muted-foreground hidden px-3 py-3.5 font-semibold tracking-wider uppercase align-middle leading-none sm:table-cell">
                Atualizado em
              </TableHead>
              <TableHead className="ds-mono-sm text-muted-foreground px-3 py-3.5 font-semibold tracking-wider uppercase align-middle leading-none">
                {type === "gestores" ? "Gestores" : "Operadores"}
              </TableHead>
              <TableHead className="px-3 py-3.5 text-right align-middle" aria-label="Ações" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-10 text-center">
                  <p className="ds-body text-muted-foreground">
                    Nenhum dado de KPI de {type === "gestores" ? "gestores" : "operadores"} salvo ainda
                  </p>
                  <p className="ds-mono-sm text-muted-foreground mt-1">
                    Cole sua primeira base acima.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              snapshots.map((s) => {
                const isDeleting = deletingMonth === s.mesRef;

                return (
                  <TableRow key={s.mesRef} className="hover:bg-muted/10">
                    <TableCell className="px-3 py-2 align-middle">
                      <span className="ds-body font-medium">
                        {formatMonthLabel(s.mesRef)}
                      </span>
                    </TableCell>

                    <TableCell className="ds-mono-sm text-muted-foreground hidden px-3 py-2 align-middle sm:table-cell">
                      {formatDateTimeBR(s.updatedAt)}
                    </TableCell>

                    <TableCell className="ds-mono-sm text-muted-foreground px-3 py-2 align-middle">
                      {type === "gestores" ? (
                        <>
                          {s.totalOperators} gestor{s.totalOperators === 1 ? "" : "es"}
                        </>
                      ) : (
                        <>
                          {s.totalOperators} op{s.totalOperators === 1 ? "" : "s"}
                        </>
                      )}
                    </TableCell>

                    <TableCell className="px-3 py-1.5 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(s.mesRef)}
                        aria-label={`Apagar ${formatMonthLabel(s.mesRef)}`}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                      >
                        {isDeleting ? (
                          <IconLoader2
                            size={14}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <IconTrash size={14} aria-hidden="true" />
                        )}
                        Apagar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </StyledCard>
    </section>
  );
}
