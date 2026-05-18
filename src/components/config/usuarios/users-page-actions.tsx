"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

import { NewUserModal } from "./new-user-modal";

export function UsersPageActions() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setModalOpen(true)}
        className="gap-2"
      >
        <IconPlus size={16} aria-hidden="true" />
        Novo usuário
      </Button>

      <NewUserModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
