import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { limparPausasAction } from "@/lib/bases/pausas-programadas/actions/limpar-pausas-action";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";

interface PausasAtualTableProps {
  operadores: PausaProgramadaDb[];
}

export function PausasAtualTable({ operadores }: PausasAtualTableProps) {
  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="font-sans text-xl font-semibold tracking-tight text-foreground">
            Base Atual
          </h2>
          {operadores.length > 0 && (
            <span className="font-sans rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {operadores.length}
            </span>
          )}
        </div>
        {/* Mesmo "Limpar Base" do Consolidado: ícone que expande ao segurar e
            só limpa quando a pressão completa. */}
        {operadores.length > 0 && (
          <ClearBaseButton
            action={limparPausasAction}
          />
        )}
      </div>

      {/* Só as cantoneiras, igual à tabela de operadores do Consolidado. */}
      <KpiFrame>
        {/* data-tabela-pausas: cabeçalho no padrão do Consolidado (bases-pausas.css). */}
        <Table data-tabela-pausas>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Agente", "Célula", "Login", "Logout", "D1", "P20", "D2"].map((h) => (
                <TableHead key={h} className="px-3 py-3 align-middle">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {operadores.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center">
                  <p className="font-sans text-sm text-muted-foreground">
                    Nenhum operador cadastrado ainda
                  </p>
                  <p className="font-sans text-xs text-muted-foreground mt-1">
                    Cole a base acima para começar.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              operadores.map((op) => (
                <TableRow key={op.id} className="hover:bg-transparent">
                  <TableCell className="px-3 py-2.5 align-middle font-medium">
                    {op.operatorEmail}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 py-2.5 align-middle">
                    {op.celula || "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle tabular-nums">
                    {op.horaLogin || "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle tabular-nums">
                    {op.horaLogout || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 py-2.5 align-middle tabular-nums">
                    {op.descanso1 || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 py-2.5 align-middle tabular-nums">
                    {op.pausa20 || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 py-2.5 align-middle tabular-nums">
                    {op.descanso2 || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </KpiFrame>
    </section>
  );
}
