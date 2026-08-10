import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { limparPausasAction } from "@/lib/bases/pausas-programadas/actions/limpar-pausas-action";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";

interface PausasAtualTableProps {
  operadores: PausaProgramadaDb[];
}

export function PausasAtualTable({ operadores }: PausasAtualTableProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="ds-h2">
          Base atual: {operadores.length} operador{operadores.length === 1 ? "" : "es"}{" "}
          cadastrado{operadores.length === 1 ? "" : "s"}
        </h2>
        {operadores.length > 0 && (
          <ClearBaseButton action={limparPausasAction} />
        )}
      </div>

      {operadores.length === 0 ? (
        <div className="elevation-1 rounded-xl p-8 text-center">
          <p className="ds-body text-muted-foreground">
            Nenhum operador cadastrado ainda
          </p>
          <p className="ds-mono-sm text-muted-foreground mt-1">
            Cole a base acima para começar.
          </p>
        </div>
      ) : (
        <div className="elevation-1 overflow-hidden rounded-xl">
          <div
            className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="col-span-3">Agente</div>
            <div className="col-span-2">Célula</div>
            <div className="col-span-2">Login</div>
            <div className="col-span-2">Logout</div>
            <div className="col-span-1">D1</div>
            <div className="col-span-1">P20</div>
            <div className="col-span-1">D2</div>
          </div>

          {operadores.map((op) => (
            <div
              key={op.id}
              className="grid grid-cols-12 items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="col-span-3 min-w-0">
                <p className="ds-mono-sm truncate">{op.operatorEmail}</p>
              </div>
              <div className="col-span-2 min-w-0">
                <p className="ds-mono-sm text-muted-foreground truncate">
                  {op.celula || "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="ds-mono-sm">{op.horaLogin || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="ds-mono-sm">{op.horaLogout || "—"}</p>
              </div>
              <div className="col-span-1">
                <p className="ds-mono-sm text-muted-foreground">
                  {op.descanso1 || "—"}
                </p>
              </div>
              <div className="col-span-1">
                <p className="ds-mono-sm text-muted-foreground">
                  {op.pausa20 || "—"}
                </p>
              </div>
              <div className="col-span-1">
                <p className="ds-mono-sm text-muted-foreground">
                  {op.descanso2 || "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
