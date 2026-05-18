"use client";

import { useState, useTransition } from "react";
import { IconDice5, IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createUserAction } from "@/lib/users/actions/create-user-action";
import { generateRandomPassword } from "@/lib/users/generate-password";
import { ALL_ROLES_FOR_CREATION } from "@/lib/users/types";
import type { UserRole } from "@/lib/users/types";

import { PasswordRevealCard } from "./password-reveal-card";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewUserModal({ open, onClose }: Props) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [emailLocal, setEmailLocal] = useState("");
  const [role, setRole] = useState<UserRole>("OP");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdUserName, setCreatedUserName] = useState<string>("");

  function reset() {
    setFullName("");
    setUsername("");
    setEmailLocal("");
    setRole("OP");
    setPassword("");
    setCreatedPassword(null);
    setCreatedUserName("");
  }

  function handleClose() {
    if (isPending) return;
    const didCreate = !!createdPassword;
    reset();
    onClose();
    if (didCreate) router.refresh();
  }

  function handleGenerate() {
    setPassword(generateRandomPassword());
  }

  function handleSubmit() {
    if (!fullName.trim()) return toast.error("Nome completo obrigatório");
    if (!username.trim()) return toast.error("Username obrigatório");
    if (!emailLocal.trim()) return toast.error("Email corporativo obrigatório");
    if (password.length < 8)
      return toast.error("Senha deve ter pelo menos 8 caracteres");

    startTransition(async () => {
      const r = await createUserAction({
        fullName,
        username,
        emailCorporativoLocal: emailLocal,
        role,
        password,
      });

      if (r.success) {
        toast.success("Usuário criado");
        setCreatedPassword(r.password);
        setCreatedUserName(fullName);
      } else {
        toast.error(r.error);
      }
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
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="elevation-3 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                {createdPassword ? "Usuário criado" : "Novo usuário"}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground rounded-md p-1"
                aria-label="Fechar"
              >
                <IconX size={20} aria-hidden="true" />
              </button>
            </div>

            {createdPassword ? (
              <>
                <PasswordRevealCard
                  password={createdPassword}
                  userName={createdUserName}
                />
                <div className="mt-6 flex justify-end">
                  <Button type="button" onClick={handleClose}>
                    Fechar
                  </Button>
                </div>
              </>
            ) : (
              <>
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
                      placeholder="Sara Secundo Batista da Silva"
                      className="elevation-2 ds-body w-full rounded-md px-3 py-2"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  </div>

                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Username
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) =>
                          setUsername(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9.-]/g, ""),
                          )
                        }
                        disabled={isPending}
                        placeholder="sara.secundo"
                        className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                        style={{ border: "1px solid var(--border)" }}
                      />
                      <span className="ds-mono-sm text-muted-foreground shrink-0">
                        @interno.angelicais.app
                      </span>
                    </div>
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
                        placeholder="sara.secundo"
                        className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                        style={{ border: "1px solid var(--border)" }}
                      />
                      <span className="ds-mono-sm text-muted-foreground shrink-0">
                        @alloha.com
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Role inicial
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      disabled={isPending}
                      className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                      style={{
                        border: "1px solid var(--border)",
                        colorScheme: "dark",
                      }}
                    >
                      {ALL_ROLES_FOR_CREATION.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Senha (mín. 8 caracteres)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isPending}
                        placeholder="Digite ou gere"
                        className="elevation-2 ds-mono flex-1 rounded-md px-3 py-2"
                        style={{ border: "1px solid var(--border)" }}
                      />
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isPending}
                        className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <IconDice5 size={14} aria-hidden="true" />
                        <span className="ds-mono-sm">Gerar</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="gap-2"
                  >
                    {isPending && (
                      <IconLoader2
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {isPending ? "Criando..." : "Criar usuário"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
