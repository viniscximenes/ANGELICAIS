"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";

import { NewDiarioModal } from "./new-diario-modal";

interface Props {
  operators: OperatorItem[];
}

export function DiarioPageActions({ operators }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setModalOpen(true)}
        className="gap-2"
      >
        <IconPlus size={16} aria-hidden="true" />
        Novo registro
      </Button>

      <NewDiarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        operators={operators}
      />
    </>
  );
}
