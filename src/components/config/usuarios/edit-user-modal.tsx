"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateUserAction } from "@/lib/users/actions/update-user-action";
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

export function EditUserModal({ open, onClose, user }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [emailLocal, setEmailLocal] = useState(
    extractLocal(user.emailCorporativo),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFullName(user.fullName);
    setEmailLocal(extractLocal(user.emailCorporativo));
  }, [user]);

  function handleSubmit() {
    if (!fullName.trim()) return toast.error("Nome obrigatório");
    if (!emailLocal.trim()) return toast.error("Email corporativo obrigatório");

    startTransition(async () => {
      const r = await updateUserAction({
        id: user.id,
        fullName,
        emailCorporativoLocal: emailLocal,
      });

      if (r.success) {
        toast.success("Usuário atualizado");
        onClose();
        router.refresh();
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
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="elevation-3 w-full max-w-xl rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                Editar usuário
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground rounded-md p-1"
                aria-label="Fechar"
              >
                <IconX size={20} aria-hidden="true" />
              </button>
            </div>

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
                  Username (não editável)
                </label>
                <div
                  className="ds-mono-sm elevation-2 text-muted-foreground rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {user.username}@interno.angelicais.app
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
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                  <span className="ds-mono-sm text-muted-foreground shrink-0">
                    @alloha.com
                  </span>
                </div>
              </div>
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
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
