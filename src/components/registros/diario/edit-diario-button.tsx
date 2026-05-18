"use client";

import { useState } from "react";
import { IconPencil } from "@tabler/icons-react";

import type { DiarioRegistro } from "@/lib/diario/types";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";

import { NewDiarioModal } from "./new-diario-modal";

interface Props {
  registro: DiarioRegistro;
  operators: OperatorItem[];
}

export function EditDiarioButton({ registro, operators }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
        aria-label="Editar registro"
        title="Editar registro"
      >
        <IconPencil size={16} aria-hidden="true" />
      </button>

      <NewDiarioModal
        open={open}
        onClose={() => setOpen(false)}
        operators={operators}
        editingRegistro={registro}
      />
    </>
  );
}
