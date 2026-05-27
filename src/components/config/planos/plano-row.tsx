"use client";

import { useState } from "react";
import { IconPencil } from "@tabler/icons-react";

import type { PlanoWithMarca } from "@/lib/config/planos/types";

import { DeletePlanoButton } from "./delete-plano-button";
import { EditPlanoModal } from "./edit-plano-modal";
import { ReorderPlanoButtons } from "./reorder-plano-buttons";
import { TogglePlanoActiveButton } from "./toggle-plano-active-button";

interface Props {
  plano: PlanoWithMarca;
  isFirst: boolean;
  isLast: boolean;
}

export function PlanoRow({ plano, isFirst, isLast }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div
        className="grid grid-cols-12 items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
        style={{
          borderColor: "var(--border)",
          opacity: plano.isActive ? 1 : 0.6,
        }}
      >
        <div className="col-span-1">
          <ReorderPlanoButtons
            plano={plano}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
        <div className="col-span-5">
          <p
            className="ds-body"
            style={{
              textDecoration: plano.isActive ? "none" : "line-through",
            }}
          >
            {plano.nome}
          </p>
        </div>
        <div className="col-span-2 ds-mono">
          R$ {plano.valor.toFixed(2).replace(".", ",")}
        </div>
        <div className="col-span-1">
          <span
            className="ds-mono-sm"
            style={{
              color: plano.isActive
                ? "var(--success)"
                : "var(--muted-foreground)",
            }}
          >
            {plano.isActive ? "Ativo" : "Inativo"}
          </span>
        </div>
        <div className="col-span-3 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
            style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            aria-label="Editar plano"
          >
            <IconPencil size={14} aria-hidden="true" />
            <span className="ds-mono-sm">Editar</span>
          </button>

          <TogglePlanoActiveButton plano={plano} />
          <DeletePlanoButton plano={plano} />
        </div>
      </div>

      <EditPlanoModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        plano={plano}
      />
    </>
  );
}
