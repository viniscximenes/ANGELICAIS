"use client";

import { useEffect, useState, useTransition } from "react";
import {
  IconLoader2,
  IconLock,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateAdminSkillAction } from "@/lib/users/actions/update-admin-skill-action";
import { updateUserAction } from "@/lib/users/actions/update-user-action";
import { updateUserRoleAction } from "@/lib/users/actions/update-user-role-action";
import type { UserProfile } from "@/lib/users/types";

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
};

/** Campo travado (nome/email da gestora) — visual de "informação", não de input. */
function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="ds-mono-sm text-muted-foreground mb-1 flex items-center gap-1.5">
        <IconLock size={12} aria-hidden="true" />
        {label}
      </div>
      <p className="ds-body text-foreground truncate">{value}</p>
      <p
        className="ds-mono-sm text-muted-foreground mt-0.5"
        style={{ fontSize: "10.5px" }}
      >
        Não editável pelo painel
      </p>
    </div>
  );
}

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
  const adminSkillChanged = canToggleAdminSkill && isAdminSkill !== user.isAdminSkill;
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
            className="elevation-3 w-full max-w-xl rounded-xl p-6 whitespace-normal"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2 truncate" style={{ fontSize: "1.25rem" }}>
                Editar: {user.fullName}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1"
                aria-label="Fechar"
              >
                <IconX size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {canEditIdentity ? (
                <div className="space-y-4">
                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isPending}
                      className="elevation-2 ds-body w-full rounded-md px-3 py-2"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  </div>

                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Email corporativo
                    </label>
                    <div className="flex items-center gap-1">
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
                        className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                        style={{ border: "1px solid var(--border)" }}
                      />
                      <span className="ds-mono-sm text-muted-foreground shrink-0">
                        @alloha.com
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Card de "informações" — visual deliberadamente discreto
                // (fundo --muted, sem borda de input) pra não parecer editável.
                <div
                  className="space-y-3 rounded-lg p-3"
                  style={{ background: "var(--muted)" }}
                >
                  <ReadOnlyField label="Nome completo" value={user.fullName} />
                  <div
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <ReadOnlyField
                    label="Email corporativo"
                    value={user.emailCorporativo}
                  />
                </div>
              )}

              {canToggleAdminSkill && (
                // Card de "ação" — o motivo real do modal existir pra uma
                // gestora, por isso é o elemento com mais peso visual aqui.
                <div
                  className="rounded-xl p-4"
                  style={{
                    border:
                      "1px solid color-mix(in oklch, var(--primary) 35%, var(--border))",
                    background:
                      "color-mix(in oklch, var(--primary) 7%, transparent)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      <IconShieldCheck
                        size={22}
                        style={{ color: "var(--primary)" }}
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <label
                          className="ds-h2 block"
                          style={{ fontSize: "1.05rem" }}
                        >
                          Também é Administrador
                        </label>
                        <p className="ds-small text-foreground mt-1">
                          Acumula o Painel Adm além do que já tem como
                          gestora.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isAdminSkill}
                      onCheckedChange={setIsAdminSkill}
                      disabled={isPending}
                      aria-label="Também é Administrador"
                      className="mt-1 shrink-0"
                    />
                  </div>
                  {adminSkillChanged && (
                    <p
                      className="ds-mono-sm mt-3 pt-3"
                      style={{
                        color: "var(--primary)",
                        borderTop:
                          "1px dashed color-mix(in oklch, var(--primary) 30%, var(--border))",
                      }}
                    >
                      {isAdminSkill
                        ? "Sidebar vai mostrar GESTOR / ADMINISTRADOR e liberar o Painel Adm."
                        : "Sidebar volta a mostrar só GESTOR, sem o Painel Adm."}
                    </p>
                  )}
                </div>
              )}

              {canChangeRole && (
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Role
                  </label>
                  <div className="flex gap-2">
                    {(["ADM", "GESTOR"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRole(option)}
                        disabled={isPending}
                        className="ds-mono-sm flex-1 rounded-md px-3 py-2 transition-colors"
                        style={{
                          border: `1px solid ${role === option ? "var(--primary)" : "var(--border)"}`,
                          background:
                            role === option
                              ? "color-mix(in oklch, var(--primary) 12%, transparent)"
                              : "var(--elevation-2-bg)",
                          color:
                            role === option
                              ? "var(--primary)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {ROLE_LABEL[option]}
                      </button>
                    ))}
                  </div>
                  {roleChanged && (
                    <p className="ds-mono-sm text-muted-foreground mt-1.5">
                      {role === "ADM"
                        ? "Vai perder o Painel do Gestor e ganhar o Painel Administrativo (Usuários, Bases)."
                        : "Vai perder o Painel Administrativo e ganhar o Painel do Gestor (Equipe, KPI, D-1)."}
                    </p>
                  )}
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
