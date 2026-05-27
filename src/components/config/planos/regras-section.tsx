"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import type { RegraGrouped } from "@/lib/config/planos/types";

import { NewRegraModal } from "./new-regra-modal";
import { RegrasTable } from "./regras-table";

interface Props {
  regras: RegraGrouped;
}

export function RegrasSection({ regras }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
          Regras de Desconto
        </h2>
        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          className="gap-2"
        >
          <IconPlus size={16} aria-hidden="true" />
          Nova regra
        </Button>
      </div>

      <RegrasTable regras={regras.semOtt} />

      <NewRegraModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
