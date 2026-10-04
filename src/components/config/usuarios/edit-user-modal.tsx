"use client";

import { useEffect, useState, useTransition } from "react";
import {
  IconLoader2,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Segmentado } from "@/components/dashboard/retencao/segmentado";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateAdminSkillAction } from "@/lib/users/actions/update-admin-skill-action";
import { updateUserAction } from "@/lib/users/actions/update-user-action";
import { updateUserRoleAction } from "@/lib/users/actions/update-user-role-action";
import type { UserProfile } from "@/lib/users/types";

// Mesmo visual dos campos do Novo usuário / campo de colar de /s/bases.
const CAMPO =
  "font-sans w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-sm text-foreground disabled:opacity-60";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
}

const CORP_DOMAIN = "@alloha.com";

function extractLocal(email: string): string {
  return email.replace(CORP_DOMAIN, "");
}

const ROLE_LABEL: Record<UserProfile["role"], string> = {
  ADM: "Administrador",
  GESTOR: "Gestor",
  COORDENADOR: "Coordenador",
};

export function EditUserModal({ open, onClose, user }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [emailLocal, setEmailLocal] = useState(
    extractLocal(user.emailCorporativo),
  );
  // Só existem ADM e GESTOR — a troca é sempre válida em qualquer direção
  // (a própria conta é bloqueada no servidor, ver updateUserRoleAction).
  const canChangeRole = true;
  const [role, setRole] = useState<UserProfile["role"]>(user.role);
  // Identidade (nome/email) não é editável pelo painel pra GESTOR — mesma
  // regra já aplicada por updateUserAction no servidor. A skill de admin é
  // a única coisa editável nesse caso, e por isso é o elemento em destaque
  // do modal quando o usuário é uma gestora.
  const canEditIdentity = user.role !== "GESTOR";
  const canToggleAdminSkill = user.role === "GESTOR";
  const [isAdminSkill, setIsAdminSkill] = useState(user.isAdminSkill);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFullName(user.fullName);
    setEmailLocal(extractLocal(user.emailCorporativo));
    setRole(user.role);
    setIsAdminSkill(user.isAdminSkill);
  }, [user]);

  const identityChanged =
    canEditIdentity &&
    (fullName.trim() !== user.fullName ||
      emailLocal !== extractLocal(user.emailCorporativo));
  const roleChanged = canChangeRole && role !== user.role;
  // A skill só faz sentido enquanto a role continuar GESTOR.
  const adminSkillChanged =
    canToggleAdminSkill && role === "GESTOR" && isAdminSkill !== user.isAdminSkill;
  const hasChanges = identityChanged || roleChanged || adminSkillChanged;

  function handleSubmit() {
    if (!hasChanges) return;

    if (canEditIdentity) {
      if (!fullName.trim()) return toast.error("Nome obrigatório");
      if (!emailLocal.trim())
        return toast.error("Email corporativo obrigatório");
    }

    startTransition(async () => {
      if (canEditIdentity && identityChanged) {
        const r = await updateUserAction({
          id: user.id,
          fullName,
          emailCorporativoLocal: emailLocal,
        });

        if (!r.success) {
          toast.error(r.error);
          return;
        }
      }

      if (roleChanged) {
        const roleResult = await updateUserRoleAction({
          id: user.id,
          newRole: role,
        });

        if (!roleResult.success) {
          toast.error(roleResult.error);
          return;
        }
      }

      if (adminSkillChanged) {
        const adminResult = await updateAdminSkillAction({
          id: user.id,
          isAdminSkill,
        });

        if (!adminResult.success) {
          toast.error(adminResult.error);
          return;
        }
      }

      toast.success("Usuário atualizado");
      onClose();
      router.refresh();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background:
              "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            // text-left/whitespace-normal: o modal é renderizado dentro da
            // célula "Ações" (text-right + nowrap) e herdava esse alinhamento.
            className="elevation-3 w-full max-w-lg rounded-xl p-6 text-left whitespace-normal"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho: título + identidade (nome e email aparecem só aqui,
                uma vez — antes repetiam no título e num card travado). */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-sans text-xl font-semibold tracking-tight text-foreground">
                  Editar usuário
                </h2>
                {!canEditIdentity && (
                  <p className="font-sans mt-1.5 truncate text-sm text-muted-foreground">
                    {user.fullName}
                    <span className="text-muted-foreground/60"> · {user.emailCorporativo}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <IconX size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {canEditIdentity && (
                <div className="space-y-4">
                  <div>
                    <label className="font-sans mb-1.5 block text-xs text-muted-foreground">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isPending}
                      className={CAMPO}
                    />
                  </div>

                  <div>
                    <label className="font-sans mb-1.5 block text-xs text-muted-foreground">
                      Email corporativo
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={emailLocal}
                        onChange={(e) =>
                          setEmailLocal(
                            e.target.value
                              .toLowerCase()
                              .replace(/@alloha\.com$/i, ""),
                          )
                        }
                        disabled={isPending}
                        className={CAMPO}
                      />
                      <span className="font-sans shrink-0 text-sm text-muted-foreground">
                        @alloha.com
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="font-sans mb-1.5 block text-xs text-muted-foreground">
                  Role
                </label>
                {/* Mesmo toggle segmentado do Consolidado / Novo usuário. */}
                <Segmentado
                  ariaLabel="Role"
                  grupo={`editar-usuario-role-${user.id}`}
                  opcoes={(["ADM", "GESTOR", "COORDENADOR"] as const).map((r) => ({
                    valor: r,
                    rotulo: ROLE_LABEL[r],
                  }))}
                  valor={role}
                  onChange={(r) => !isPending && setRole(r)}
                />
                {roleChanged && (
                  <p className="font-sans mt-2 text-xs text-muted-foreground">
                    {role === "ADM"
                      ? "Vai perder o Painel do Gestor e ganhar o Painel Administrativo (Usuários, Bases)."
                      : "Vai perder o Painel Administrativo e ganhar o Painel do Gestor (Equipe, KPI, D-1)."}
                  </p>
                )}
              </div>

              {/* Skill de admin: modificador da role Gestor, por isso vem logo
                  abaixo dela e só aparece enquanto Gestor estiver selecionado. */}
              {canToggleAdminSkill && role === "GESTOR" && (
                <div className="border-border/60 flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-3.5 py-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <IconShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-medium text-foreground">
                        Também é Administrador
                      </p>
                      <p className="font-sans mt-0.5 text-xs text-muted-foreground">
                        {adminSkillChanged
                          ? isAdminSkill
                            ? "Vai liberar o Painel Adm na sidebar."
                            : "Vai remover o Painel Adm da sidebar."
                          : "Acumula o Painel Adm além do Painel do Gestor."}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isAdminSkill}
                    onCheckedChange={setIsAdminSkill}
                    disabled={isPending}
                    aria-label="Também é Administrador"
                    className="shrink-0"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !hasChanges}
                className="gap-2"
              >
                {isPending && (
                  <IconLoader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
