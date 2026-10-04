"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { NewUserModal } from "./new-user-modal";

export function UsersPageActions() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Mesmo botão primário h-8 dos controles do Consolidado/Bases. */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="font-sans bg-primary text-primary-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-opacity cursor-pointer select-none hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <IconPlus size={14} aria-hidden="true" />
        Novo usuário
      </button>

      <NewUserModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
