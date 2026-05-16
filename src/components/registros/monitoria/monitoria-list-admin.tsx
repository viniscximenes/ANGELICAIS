import { IconEye } from "@tabler/icons-react";
import Link from "next/link";

import type { MonitoriaWithNames } from "@/lib/monitorias/types";

import { DeleteMonitoriaButton } from "./delete-monitoria-button";
import { MonitoriaStatusBadge } from "./monitoria-status-badge";

function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

interface Props {
  monitorias: MonitoriaWithNames[];
}

export function MonitoriaListAdmin({ monitorias }: Props) {
  if (monitorias.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhuma monitoria cadastrada
        </p>
        <p className="ds-mono-sm text-muted-foreground mt-1">
          Clique em &quot;Nova monitoria&quot; para começar.
        </p>
      </div>
    );
  }

  const pending = monitorias.filter((m) => m.status === "pending");
  const finalized = monitorias.filter((m) => m.status === "finalized");
  const sent = monitorias.filter((m) => m.status === "sent");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Section title={`PENDENTES (${pending.length})`} monitorias={pending} />
      )}
      {finalized.length > 0 && (
        <Section
          title={`FINALIZADAS — AGUARDANDO ENVIO (${finalized.length})`}
          monitorias={finalized}
          highlight
        />
      )}
      {sent.length > 0 && (
        <Section
          title={`ENVIADAS AO FORMS (${sent.length})`}
          monitorias={sent}
        />
      )}
    </div>
  );
}

function Section({
  title,
  monitorias,
  highlight,
}: {
  title: string;
  monitorias: MonitoriaWithNames[];
  highlight?: boolean;
}) {
  return (
    <section>
      <h2 className="ds-mono-sm text-muted-foreground mb-3 tracking-wider">
        {title}
      </h2>
      <div
        className="elevation-1 overflow-hidden rounded-xl"
        style={
          highlight ? { borderLeft: "3px solid var(--success)" } : undefined
        }
      >
        <div
          className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="col-span-3">Operador</div>
          <div className="col-span-2">AUX Resp.</div>
          <div className="col-span-2">Data</div>
          <div className="col-span-2">ID Chamada</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {monitorias.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="col-span-3 min-w-0">
              <p className="ds-body truncate">
                {m.operatorName ?? m.operatorEmail}
              </p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="ds-mono-sm text-muted-foreground truncate">
                {m.auxResponsibleName ?? m.auxResponsibleEmail}
              </p>
            </div>
            <div className="col-span-2">
              <p className="ds-mono-sm">{formatDateBR(m.dataAtendimento)}</p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="ds-mono-sm truncate">{m.idChamada}</p>
            </div>
            <div className="col-span-1">
              <MonitoriaStatusBadge status={m.status} />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-1">
              <Link
                href={`/registros/monitoria/${m.id}`}
                className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
                aria-label="Ver detalhes"
                title="Ver detalhes"
              >
                <IconEye size={16} aria-hidden="true" />
              </Link>
              <DeleteMonitoriaButton id={m.id} operatorName={m.operatorName} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
