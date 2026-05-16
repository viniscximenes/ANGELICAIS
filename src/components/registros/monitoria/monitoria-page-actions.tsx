"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";
import type { AuxItem } from "@/lib/monitorias/get-aux-operators";

import { NewMonitoriaModal } from "./new-monitoria-modal";

interface Props {
  operators: OperatorItem[];
  auxOperators: AuxItem[];
}

export function MonitoriaPageActions({ operators, auxOperators }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setModalOpen(true)}
        className="gap-2"
      >
        <IconPlus size={16} aria-hidden="true" />
        Nova monitoria
      </Button>

      <NewMonitoriaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        operators={operators}
        auxOperators={auxOperators}
      />
    </>
  );
}
