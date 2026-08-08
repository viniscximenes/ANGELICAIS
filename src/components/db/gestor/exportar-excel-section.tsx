"use client";

import { useState, useTransition } from "react";
import { IconFileSpreadsheet, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { exportarExcelAction } from "@/lib/db/actions/exportar-excel-action";
import type { MesSelecionado } from "@/lib/db/types";

const MESES: Array<{ id: MesSelecionado; label: string }> = [
  { id: "atual", label: "Mês atual" },
  { id: "passado", label: "Mês passado" },
];

function base64ToBlob(base64: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array<number>(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function ExportarExcelSection() {
  const [mes, setMes] = useState<MesSelecionado>("atual");
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportarExcelAction(mes);

      if (!result.success) {
        toast.error("Não foi possível exportar", { description: result.error });
        return;
      }

      const blob = base64ToBlob(result.base64);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel exportado");
    });
  }

  return (
    <div className="elevation-1 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
      <div role="tablist" className="inline-flex gap-1 rounded-md p-1" style={{ background: "var(--muted)" }}>
        {MESES.map((m) => {
          const isActive = mes === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMes(m.id)}
              disabled={isPending}
              className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="gap-1.5"
      >
        {isPending ? (
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <IconFileSpreadsheet size={14} aria-hidden="true" />
        )}
        {isPending ? "Gerando..." : "Exportar Excel"}
      </Button>
    </div>
  );
}
