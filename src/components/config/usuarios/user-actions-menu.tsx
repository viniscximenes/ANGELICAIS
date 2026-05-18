"use client";

import { useState } from "react";
import { IconKey, IconPencil } from "@tabler/icons-react";

import type { UserProfile } from "@/lib/users/types";

import { ChangeRoleButton } from "./change-role-button";
import { EditUserModal } from "./edit-user-modal";
import { SetPasswordModal } from "./set-password-modal";
import { ToggleActiveButton } from "./toggle-active-button";

interface Props {
  user: UserProfile;
}

export function UserActionsMenu({ user }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="text-muted-foreground hover:text-foreground elevation-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
          style={{ border: "1px solid var(--border)", fontSize: "12px" }}
          aria-label="Editar usuário"
        >
          <IconPencil size={14} aria-hidden="true" />
          <span className="ds-mono-sm">Editar</span>
        </button>

        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="text-muted-foreground hover:text-foreground elevation-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
          style={{ border: "1px solid var(--border)", fontSize: "12px" }}
          aria-label="Definir nova senha"
        >
          <IconKey size={14} aria-hidden="true" />
          <span className="ds-mono-sm">Senha</span>
        </button>

        {(user.role === "OP" || user.role === "AUX") && (
          <ChangeRoleButton user={user} />
        )}

        <ToggleActiveButton user={user} />
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
    </>
  );
}
