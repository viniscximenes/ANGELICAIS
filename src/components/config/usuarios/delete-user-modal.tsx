"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteUserAction } from "@/lib/users/actions/delete-user-action";
import type { UserProfile } from "@/lib/users/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
}

export function DeleteUserModal({ open, onClose, user }: Props) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setBlockedError(null);
    }
  }, [open, user]);

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  const canConfirm =
    confirmText.trim().toLowerCase() === user.username.toLowerCase();

  function handleSubmit() {
    if (!canConfirm) return;

    startTransition(async () => {
      const r = await deleteUserAction({ id: user.id });

      if (r.success) {
        toast.success("Usuário excluído");
        onClose();
        router.refresh();
      } else {
        setBlockedError(r.error);
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
                Excluir usuário
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

            <div className="space-y-4">
              <p className="ds-body">
                Essa ação é <strong>PERMANENTE</strong> e{" "}
                <strong>IRREVERSÍVEL</strong>. A conta de{" "}
                <strong>{user.username}</strong> será excluída do banco de
                dados e não poderá ser recuperada.
              </p>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Digite <strong className="text-foreground">{user.username}</strong>{" "}
                  para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isPending}
                  placeholder={user.username}
                  autoComplete="off"
                  className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>

              {blockedError && (
                <p className="ds-mono-sm" style={{ color: "var(--destructive)" }}>
                  {blockedError}
                </p>
              )}
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
                variant="destructive"
                onClick={handleSubmit}
                disabled={isPending || !canConfirm}
                className="gap-2"
              >
                {isPending && (
                  <IconLoader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isPending ? "Excluindo..." : "Excluir permanentemente"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
