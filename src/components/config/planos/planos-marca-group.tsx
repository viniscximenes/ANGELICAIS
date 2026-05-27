"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconPlus,
} from "@tabler/icons-react";

import type { Marca, PlanoWithMarca } from "@/lib/config/planos/types";

import { ImportPlanosModal } from "./import-planos-modal";
import { NewPlanoModal } from "./new-plano-modal";
import { PlanosTable } from "./planos-table";

interface Props {
  marca: Marca;
  planos: PlanoWithMarca[];
  todasMarcas: Marca[];
  todosPlanos: PlanoWithMarca[];
}

export function PlanosMarcaGroup({
  marca,
  planos,
  todasMarcas,
  todosPlanos,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const planosAtivos = planos.filter((p) => p.isActive).length;

  return (
    <>
      <div className="elevation-1 overflow-hidden rounded-xl">
        <div
          className="hover:bg-muted/30 flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <IconChevronDown size={16} aria-hidden="true" />
            ) : (
              <IconChevronRight size={16} aria-hidden="true" />
            )}
            <span className="ds-body font-medium">{marca.nome}</span>
            <span className="ds-mono-sm text-muted-foreground">
              ({planosAtivos} {planosAtivos === 1 ? "plano" : "planos"})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImportModalOpen(true);
              }}
              className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
              style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            >
              <IconDownload size={14} aria-hidden="true" />
              <span className="ds-mono-sm">Importar</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNewModalOpen(true);
              }}
              className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
              style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            >
              <IconPlus size={14} aria-hidden="true" />
              <span className="ds-mono-sm">Novo plano</span>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            <PlanosTable planos={planos} />
          </div>
        )}
      </div>

      <NewPlanoModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        marcaId={marca.id}
      />

      <ImportPlanosModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        marcaDestino={marca}
        todasMarcas={todasMarcas}
        todosPlanos={todosPlanos}
      />
    </>
  );
}
