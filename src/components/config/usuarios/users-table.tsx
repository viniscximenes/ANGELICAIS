import { StyledCard } from "@/components/gestor/styled-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <StyledCard withGradient className="p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhum usuário cadastrado
        </p>
      </StyledCard>
    );
  }

  return (
    <StyledCard withGradient={false} className="p-0 overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
            <TableHead className="ds-mono-sm text-foreground/90 w-[30%] px-4 py-3.5 font-bold tracking-wider uppercase align-middle leading-none">
              Login
            </TableHead>
            <TableHead className="ds-mono-sm text-foreground/90 w-[20%] px-4 py-3.5 font-bold tracking-wider uppercase align-middle leading-none">
              Role
            </TableHead>
            <TableHead className="ds-mono-sm text-foreground/90 w-[15%] px-4 py-3.5 font-bold tracking-wider uppercase align-middle leading-none">
              Status
            </TableHead>
            <TableHead className="w-[35%] px-4 py-3.5 text-right align-middle font-bold uppercase ds-mono-sm text-foreground/90 leading-none">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isMe = u.id === currentUserId;

            return (
              <TableRow
                key={u.id}
                className="hover:bg-muted/10 border-b border-border/40 last:border-b-0"
                style={{
                  opacity: u.isActive ? 1 : 0.6,
                }}
              >
                <TableCell className="overflow-hidden truncate px-4 py-2 align-middle">
                  <span
                    className="ds-mono-sm font-medium"
                    style={{
                      textDecoration: u.isActive ? "none" : "line-through",
                    }}
                  >
                    {u.username}
                  </span>

                </TableCell>
                <TableCell className="px-4 py-2 align-middle">
                  <div className="flex items-center gap-1">
                    <RoleBadge role={u.role} />
                    {u.role === "GESTOR" && u.isAdminSkill && (
                      <RoleBadge role="ADM" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-2 align-middle">
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
                </TableCell>
                <TableCell className="px-4 py-1.5 text-right align-middle">
                  <div className="flex justify-end">
                    <UserActionsMenu user={u} isSelf={isMe} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </StyledCard>
  );
}
