"use client";

import { useTransition } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HoldButton } from "@/components/ui/hold-button";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
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
  const [isPending, startTransition] = useTransition();

  // Cada histórico apaga só a SUA base — o de operadores não encosta em
  // kpi_gestor_snapshots e vice-versa.
  const scope = type === "gestores" ? "gestores" : "operadores";
  const baseLabel = type === "gestores" ? "GESTORES" : "OPERADORES";

  function handleDelete(mesRef: string) {
    startTransition(async () => {
      const result = await deleteMonthAction(mesRef, scope);

      if (!result.success) {
        toast.error("Não foi possível apagar", { description: result.error });
        return;
      }

      if (result.rowsDeleted === 0) {
        toast.info("Nada para apagar", {
          description: `Nenhum registro de ${baseLabel.toLowerCase()} em ${formatMonthLabel(mesRef)}.`,
        });
      } else {
        toast.success(`${formatMonthLabel(mesRef)} apagado`, {
          description: `${result.rowsDeleted} registro${result.rowsDeleted === 1 ? "" : "s"} de ${baseLabel.toLowerCase()} removido${result.rowsDeleted === 1 ? "" : "s"}`,
        });
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-2 pt-2">
        <h2 className="font-sans text-xl font-semibold tracking-tight text-foreground">
          Histórico
        </h2>
        {snapshots.length > 0 && (
          <span className="font-sans rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {snapshots.length}
          </span>
        )}
      </div>

      {/* Só as cantoneiras, igual à tabela de operadores do Consolidado. */}
      <KpiFrame>
        {/* data-tabela-historico: cabeçalho no padrão do Consolidado (bases-kpi.css). */}
        <Table data-tabela-historico>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3 py-3 align-middle">
                Mês
              </TableHead>
              <TableHead className="hidden px-3 py-3 align-middle sm:table-cell">
                Atualizado em
              </TableHead>
              <TableHead className="px-3 py-3 align-middle">
                {type === "gestores" ? "Gestores" : "Operadores"}
              </TableHead>
              <TableHead className="px-3 py-3 text-right align-middle" aria-label="Ações" />
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
                return (
                  <TableRow key={s.mesRef} className="hover:bg-transparent">
                    <TableCell className="px-3 py-2.5 align-middle">
                      <span className="font-medium">
                        {formatMonthLabel(s.mesRef)}
                      </span>
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden px-3 py-2.5 align-middle sm:table-cell">
                      {formatDateTimeBR(s.updatedAt)}
                    </TableCell>

                    <TableCell className="text-muted-foreground px-3 py-2.5 tabular-nums align-middle">
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
                      {/* Mesmo Hold Button do "Limpar Base" do Consolidado:
                          segurar expande, revela o texto e só apaga ao
                          completar a pressão (substitui o confirm()). */}
                      <div className="inline-flex justify-end">
                        <HoldButton
                          disabled={isPending}
                          ariaLabel={`Segure para apagar ${formatMonthLabel(s.mesRef)}`}
                          icon={<IconTrash size={15} aria-hidden="true" />}
                          doneIcon={
                            <IconLoader2 size={15} className="animate-spin" aria-hidden="true" />
                          }
                          doneLabel="Apagando..."
                          fillColor="var(--seg-thumb)"
                          fillTextColor="var(--seg-text-active)"
                          textColor="var(--muted-foreground)"
                          holdTime={1600}
                          releaseTime={200}
                          resetAfter={1200}
                          expandedWidth={116}
                          onHold={() => handleDelete(s.mesRef)}
                          className="bases-kpi-apagar font-sans border border-border"
                        >
                          Apagar
                        </HoldButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </KpiFrame>
    </section>
  );
}
