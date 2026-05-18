import type { UserProfile } from "@/lib/users/types";

import { RoleBadge } from "./role-badge";
import { UserActionsMenu } from "./user-actions-menu";

interface Props {
  users: UserProfile[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: Props) {
  if (users.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhum usuário cadastrado
        </p>
      </div>
    );
  }

  return (
    <div className="elevation-1 overflow-hidden rounded-xl">
      <div
        className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-3">Nome</div>
        <div className="col-span-2">Login</div>
        <div className="col-span-3">Email Corp.</div>
        <div className="col-span-1">Role</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Ações</div>
      </div>

      {users.map((u) => {
        const isMe = u.id === currentUserId;
        const isGestor = u.role === "GESTOR";
        const isLocked = isMe || isGestor;

        return (
          <div
            key={u.id}
            className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 last:border-b-0"
            style={{
              borderColor: "var(--border)",
              opacity: u.isActive ? 1 : 0.6,
            }}
          >
            <div className="col-span-3 min-w-0">
              <p
                className="ds-body truncate"
                style={{
                  textDecoration: u.isActive ? "none" : "line-through",
                }}
              >
                {u.fullName}
                {isMe && (
                  <span className="ds-mono-sm text-muted-foreground ml-2">
                    (você)
                  </span>
                )}
                {isGestor && (
                  <span className="ds-mono-sm text-muted-foreground ml-2">
                    (gestora)
                  </span>
                )}
              </p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="ds-mono-sm text-muted-foreground truncate">
                {u.username}
              </p>
            </div>
            <div className="col-span-3 min-w-0">
              <p className="ds-mono-sm text-muted-foreground truncate">
                {u.emailCorporativo}
              </p>
            </div>
            <div className="col-span-1">
              <RoleBadge role={u.role} />
            </div>
            <div className="col-span-1">
              <span
                className="ds-mono-sm"
                style={{
                  color: u.isActive
                    ? "var(--success)"
                    : "var(--muted-foreground)",
                }}
              >
                {u.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="col-span-2 flex justify-end">
              {isLocked ? (
                <span className="ds-mono-sm text-muted-foreground">—</span>
              ) : (
                <UserActionsMenu user={u} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
