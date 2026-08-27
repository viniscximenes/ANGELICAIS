import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { StyledCard } from "@/components/gestor/styled-card";
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
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Base Atual
          </span>
          {operadores.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground font-medium">
              {operadores.length}
            </span>
          )}
        </div>
        <div className="flex-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-border/40" aria-hidden="true" />
          {operadores.length > 0 && (
            <ClearBaseButton action={limparPausasAction} />
          )}
        </div>
      </div>

      {operadores.length === 0 ? (
        <StyledCard withGradient className="p-8 text-center">
          <p className="ds-body text-muted-foreground">
            Nenhum operador cadastrado ainda
          </p>
          <p className="ds-mono-sm text-muted-foreground mt-1">
            Cole a base acima para começar.
          </p>
        </StyledCard>
      ) : (
        <StyledCard withGradient={false} className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  Agente
                </TableHead>
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  Célula
                </TableHead>
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  Login
                </TableHead>
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  Logout
                </TableHead>
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  D1
                </TableHead>
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  P20
                </TableHead>
                <TableHead className="ds-mono-sm text-muted-foreground px-4 py-3 font-semibold tracking-wider uppercase align-middle leading-none">
                  D2
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operadores.map((op) => (
                <TableRow key={op.id} className="hover:bg-muted/10 border-b border-border/40 last:border-b-0">
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm font-medium">{op.operatorEmail}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm text-muted-foreground">{op.celula || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm">{op.horaLogin || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm">{op.horaLogout || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm text-muted-foreground">{op.descanso1 || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm text-muted-foreground">{op.pausa20 || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 align-middle">
                    <span className="ds-mono-sm text-muted-foreground">{op.descanso2 || "—"}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledCard>
      )}
    </section>
  );
}
