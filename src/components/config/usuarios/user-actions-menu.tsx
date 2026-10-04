"use client";

import { useState } from "react";
import { IconKey, IconPencil, IconTrash } from "@tabler/icons-react";

import type { UserProfile } from "@/lib/users/types";

import { DeleteUserModal } from "./delete-user-modal";
import { EditUserModal } from "./edit-user-modal";
import { SetPasswordModal } from "./set-password-modal";
import { ToggleActiveButton } from "./toggle-active-button";

interface Props {
  user: UserProfile;
  isSelf?: boolean;
}

export function UserActionsMenu({ user, isSelf = false }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {!isSelf && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Editar usuário"
          >
            <IconPencil size={14} aria-hidden="true" />
            Editar
          </button>
        )}

        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Definir nova senha"
        >
          <IconKey size={14} aria-hidden="true" />
          Senha
        </button>

        {!isSelf && !user.isActive && <ToggleActiveButton user={user} />}

        {!isSelf && user.isActive && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="font-sans border-border text-[var(--destructive)] hover:bg-destructive/10 inline-flex h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Excluir usuário"
          >
            <IconTrash size={14} aria-hidden="true" />
            Deletar
          </button>
        )}
      </div>

      <EditUserModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
      />
      <SetPasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        user={user}
      />
      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        user={user}
      />
    </>
  );
}
