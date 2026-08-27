"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { NewUserModal } from "./new-user-modal";

export function UsersPageActions() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none"
        )}
        style={{ fontSize: "12px" }}
      >
        <IconPlus size={14} aria-hidden="true" />
        <span className="ds-mono-sm font-medium">Novo usuário</span>
      </button>

      <NewUserModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
