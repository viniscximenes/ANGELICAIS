"use client";

import type { ContagemPorDia } from "@/lib/db/detectar-registros";
import { formatDateBR } from "@/lib/utils/format-datetime-br";

interface DiaSelectorProps {
  dias: ContagemPorDia[];
  value: string;
  onChange: (dataRef: string) => void;
}

export function DiaSelector({ dias, value, onChange }: DiaSelectorProps) {
  if (dias.length === 0) {
    return (
      <p className="ds-small text-muted-foreground">
        Nenhum dia com CSV disponível. Peça pro ADM subir o CSV do dia em
        Configurações / Diário de Bordo.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="db-dia-selector" className="ds-mono-sm text-muted-foreground">
        Dia
      </label>
      <select
        id="db-dia-selector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="elevation-1 ds-body rounded-md px-3 py-2"
        style={{ border: "1px solid var(--border)" }}
      >
        {dias.map((d) => (
          <option key={d.dataRef} value={d.dataRef}>
            {formatDateBR(d.dataRef)} ({d.totalRegistros} registros detectados)
          </option>
        ))}
      </select>
    </div>
  );
}
