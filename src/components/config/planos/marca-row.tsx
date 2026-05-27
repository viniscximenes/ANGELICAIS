"use client";

import { useState } from "react";
import { IconPencil } from "@tabler/icons-react";

import type { Marca } from "@/lib/config/planos/types";

import { DeleteMarcaButton } from "./delete-marca-button";
import { EditMarcaModal } from "./edit-marca-modal";
import { ToggleMarcaActiveButton } from "./toggle-marca-active-button";

interface Props {
  marca: Marca;
}

export function MarcaRow({ marca }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div
        className="grid grid-cols-12 items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
        style={{
          borderColor: "var(--border)",
          opacity: marca.isActive ? 1 : 0.6,
        }}
      >
        <div className="col-span-5">
          <p
            className="ds-body"
            style={{
              textDecoration: marca.isActive ? "none" : "line-through",
            }}
          >
            {marca.nome}
          </p>
        </div>
        <div className="col-span-2">
          <span
            className="ds-mono-sm"
            style={{
              color: marca.isActive
                ? "var(--success)"
                : "var(--muted-foreground)",
            }}
          >
            {marca.isActive ? "Ativa" : "Inativa"}
          </span>
        </div>
        <div className="col-span-2 ds-mono-sm text-muted-foreground">
          {marca.planosCount ?? 0}
        </div>
        <div className="col-span-3 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
            style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            aria-label="Editar marca"
          >
            <IconPencil size={14} aria-hidden="true" />
            <span className="ds-mono-sm">Editar</span>
          </button>

          <ToggleMarcaActiveButton marca={marca} />
          <DeleteMarcaButton marca={marca} />
        </div>
      </div>

      <EditMarcaModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        marca={marca}
      />
    </>
  );
}
