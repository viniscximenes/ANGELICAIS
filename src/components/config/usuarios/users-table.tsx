import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
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
  return (
    // Só as cantoneiras, igual à tabela de operadores do Consolidado.
    <KpiFrame>
      {/* data-tabela-usuarios: cabeçalho no padrão do Consolidado
          (configuracoes-usuarios.css). */}
      <Table data-tabela-usuarios>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-3 py-3 align-middle">Login</TableHead>
            <TableHead className="px-3 py-3 align-middle">Role</TableHead>
            {/* w-px + nowrap: a coluna de ações encolhe até o tamanho exato dos
                botões (sem quebrar linha) e o resto da largura fica com as
                outras colunas. */}
            <TableHead className="w-px px-3 py-3 text-right align-middle whitespace-nowrap">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={3} className="py-10 text-center">
                <p className="font-sans text-sm text-muted-foreground">
                  Nenhum usuário cadastrado
                </p>
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => {
              const isMe = u.id === currentUserId;

              return (
                <TableRow
                  key={u.id}
                  className="hover:bg-transparent"
                  style={{ opacity: u.isActive ? 1 : 0.6 }}
                >
                  <TableCell className="overflow-hidden truncate px-3 py-2.5 align-middle">
                    <span
                      className="font-medium"
                      style={{
                        textDecoration: u.isActive ? "none" : "line-through",
                      }}
                    >
                      {u.username}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex items-center gap-1">
                      <RoleBadge role={u.role} />
                      {u.role === "GESTOR" && u.isAdminSkill && (
                        <RoleBadge role="ADM" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-px px-3 py-2 text-right align-middle whitespace-nowrap">
                    <div className="flex justify-end">
                      <UserActionsMenu user={u} isSelf={isMe} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </KpiFrame>
  );
}
