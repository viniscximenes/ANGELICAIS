"use client";

import { useState, useTransition } from "react";
import {
  IconAlertTriangle,
  IconDice5,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setUserPasswordAction } from "@/lib/users/actions/set-user-password-action";
import { generateRandomPassword } from "@/lib/users/generate-password";
import type { UserProfile } from "@/lib/users/types";

import { PasswordRevealCard } from "./password-reveal-card";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
}

export function SetPasswordModal({ open, onClose, user }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [definedPassword, setDefinedPassword] = useState<string | null>(null);

  function reset() {
    setPassword("");
    setDefinedPassword(null);
  }

  function handleClose() {
    if (isPending) return;
    const didDefine = !!definedPassword;
    reset();
    onClose();
    if (didDefine) router.refresh();
  }

  function handleGenerate() {
    setPassword(generateRandomPassword());
  }

  function handleSubmit() {
    if (password.length < 8)
      return toast.error("Senha deve ter pelo menos 8 caracteres");

    startTransition(async () => {
      const r = await setUserPasswordAction({
        id: user.id,
        newPassword: password,
      });

      if (r.success) {
        toast.success("Senha definida");
        setDefinedPassword(r.password);
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
            className="elevation-3 w-full max-w-xl rounded-xl p-6 whitespace-normal"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                {definedPassword
                  ? "Senha definida"
                  : `Definir senha de ${user.username}`}
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

            {definedPassword ? (
              <>
                <PasswordRevealCard
                  password={definedPassword}
                  userName={user.username}
                />
                <div className="mt-6 flex justify-end">
                  <Button type="button" onClick={handleClose}>
                    Fechar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div
                  // Tema claro: fundo sólido + texto branco (o token
                  // --warning-bg é quase branco no claro, ilegível). Tema
                  // escuro mantém os tokens translúcidos originais.
                  className="mb-4 flex items-start gap-2 rounded-lg border p-3 bg-amber-700 border-amber-800 dark:bg-[var(--warning-bg)] dark:border-[var(--warning-border)]"
                >
                  <IconAlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-white dark:text-[var(--warning)]"
                    aria-hidden="true"
                  />
                  <p className="ds-mono-sm text-white dark:text-[var(--warning)]">
                    A senha atual será substituída e não poderá ser
                    recuperada.
                  </p>
                </div>

                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Nova senha (mín. 8 caracteres)
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
                    {isPending ? "Definindo..." : "Definir senha"}
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
