"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconMinus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { decrementDeflatorOccurrenceAction } from "@/lib/rv/actions/decrement-deflator-occurrence";
import { removeDeflatorApplicationAction } from "@/lib/rv/actions/remove-deflator-application";
import type { OperatorListItem } from "@/lib/rv/get-all-operators-with-emails";
import type { DeflatorApplication, DeflatorType } from "@/lib/rv/types";

interface Props {
  applications: DeflatorApplication[];
  manualDeflators: DeflatorType[];
  operators: OperatorListItem[];
}

type GroupedApplication = {
  operatorEmail: string;
  operatorName: string;
  apps: Array<{
    application: DeflatorApplication;
    deflatorType: DeflatorType;
    totalPercent: number;
  }>;
};

export function ApplyDeflatorList({
  applications,
  manualDeflators,
  operators,
}: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped: GroupedApplication[] = [];
  const operatorMap = new Map(
    operators.map((o) => [o.emailCorporativo.toLowerCase(), o]),
  );
  const typeMap = new Map(manualDeflators.map((d) => [d.id, d]));

  for (const app of applications) {
    const dt = typeMap.get(app.deflatorTypeId);
    if (!dt) continue;

    const op = operatorMap.get(app.operatorEmail.toLowerCase());
    const operatorName = op ? op.fullName : app.operatorEmail;

    let group = grouped.find((g) => g.operatorEmail === app.operatorEmail);
    if (!group) {
      group = { operatorEmail: app.operatorEmail, operatorName, apps: [] };
      grouped.push(group);
    }

    const totalPercent =
      dt.initialPercent + (app.occurrenceCount - 1) * dt.incrementPerOccurrence;

    group.apps.push({
      application: app,
      deflatorType: dt,
      totalPercent,
    });
  }

  grouped.sort((a, b) => a.operatorName.localeCompare(b.operatorName));

  function handleDecrement(appId: string) {
    setPendingId(appId);
    startTransition(async () => {
      const r = await decrementDeflatorOccurrenceAction(appId);
      setPendingId(null);
      if (r.success) {
        toast.success(r.deleted ? "Aplicação removida" : "Ocorrência diminuída");
      } else {
        toast.error(r.error);
      }
    });
  }

  function handleRemove(appId: string) {
    if (!confirm("Remover todas as ocorrências deste deflator?")) return;

    setPendingId(appId);
    startTransition(async () => {
      const r = await removeDeflatorApplicationAction(appId);
      setPendingId(null);
      if (r.success) {
        toast.success("Aplicação removida");
      } else {
        toast.error(r.error);
      }
    });
  }

  if (grouped.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhuma ocorrência cadastrada neste mês.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.operatorEmail} className="elevation-1 rounded-xl p-5">
          <div className="mb-3">
            <p className="ds-body font-medium">{group.operatorName}</p>
            <p className="ds-mono-sm text-muted-foreground">
              {group.operatorEmail}
            </p>
          </div>

          <div className="space-y-2">
            {group.apps.map(({ application, deflatorType, totalPercent }) => {
              const thisRowPending = pendingId === application.id && isPending;

              return (
                <div
                  key={application.id}
                  className="elevation-2 flex items-center justify-between gap-3 rounded-md px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="ds-body">{deflatorType.displayName}</p>
                    <p className="ds-mono-sm text-muted-foreground">
                      {application.occurrenceCount} ocorrência
                      {application.occurrenceCount !== 1 ? "s" : ""}
                      {" • "}
                      <span style={{ color: "var(--danger)" }}>
                        -{totalPercent}%
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDecrement(application.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
                      aria-label="Diminuir ocorrência"
                      title="Diminuir ocorrência"
                    >
                      {thisRowPending ? (
                        <IconLoader2
                          size={16}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <IconMinus size={16} aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(application.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-danger rounded-md p-1.5 transition-colors"
                      aria-label="Remover todas as ocorrências"
                      title="Remover todas"
                    >
                      <IconTrash size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
