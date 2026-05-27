"use client";

import { useState } from "react";
import { IconPencil } from "@tabler/icons-react";

import { formatTempoCliente } from "@/lib/config/planos/format-tempo-cliente";
import type { RegraDesconto } from "@/lib/config/planos/types";

import { DeleteRegraButton } from "./delete-regra-button";
import { DuplicateRegraButton } from "./duplicate-regra-button";
import { EditRegraModal } from "./edit-regra-modal";

interface Props {
  regra: RegraDesconto;
}

export function RegraRow({ regra }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div
        className="grid grid-cols-12 items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-4 ds-body">
          {formatTempoCliente(regra.tempoMinMeses, regra.tempoMaxMeses)}
        </div>
        <div className="col-span-3 ds-mono">{regra.descontoMaxPct}%</div>
        <div className="col-span-2 ds-mono">
          {regra.duracaoMeses}{" "}
          {regra.duracaoMeses === 1 ? "mês" : "meses"}
        </div>
        <div className="col-span-3 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
            style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            aria-label="Editar regra"
          >
            <IconPencil size={14} aria-hidden="true" />
            <span className="ds-mono-sm">Editar</span>
          </button>

          <DuplicateRegraButton regra={regra} />
          <DeleteRegraButton regra={regra} />
        </div>
      </div>

      <EditRegraModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        regra={regra}
      />
    </>
  );
}
