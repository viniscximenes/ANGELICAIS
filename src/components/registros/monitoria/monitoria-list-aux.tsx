import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

import type { MonitoriaWithNames } from "@/lib/monitorias/types";

import { MonitoriaStatusBadge } from "./monitoria-status-badge";

function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

interface Props {
  monitorias: MonitoriaWithNames[];
}

export function MonitoriaListAux({ monitorias }: Props) {
  if (monitorias.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Você não tem monitorias atribuídas no momento
        </p>
      </div>
    );
  }

  const pending = monitorias.filter((m) => m.status === "pending");
  const finalized = monitorias.filter(
    (m) => m.status === "finalized" || m.status === "sent",
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h2 className="ds-mono-sm text-muted-foreground mb-3 tracking-wider">
            PENDENTES ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((m) => (
              <MonitoriaCardAux key={m.id} monitoria={m} />
            ))}
          </div>
        </section>
      )}

      {finalized.length > 0 && (
        <section>
          <h2 className="ds-mono-sm text-muted-foreground mb-3 tracking-wider">
            FINALIZADAS ({finalized.length})
          </h2>
          <div className="space-y-2">
            {finalized.map((m) => (
              <MonitoriaCardAux key={m.id} monitoria={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MonitoriaCardAux({ monitoria }: { monitoria: MonitoriaWithNames }) {
  return (
    <Link
      href={`/registros/monitoria/${monitoria.id}`}
      className="elevation-1 hover:elevation-2 flex items-center justify-between gap-3 rounded-lg p-4 transition-all"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="ds-body truncate font-medium">
            {monitoria.operatorName ?? monitoria.operatorEmail}
          </p>
          <MonitoriaStatusBadge status={monitoria.status} />
        </div>
        <p className="ds-mono-sm text-muted-foreground">
          {formatDateBR(monitoria.dataAtendimento)} • ID {monitoria.idChamada}
        </p>
      </div>
      <IconChevronRight
        size={18}
        className="text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
