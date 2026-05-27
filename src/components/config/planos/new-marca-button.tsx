"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

import { NewMarcaModal } from "./new-marca-modal";

export function NewMarcaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={16} aria-hidden="true" />
        Nova marca
      </Button>
      <NewMarcaModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
