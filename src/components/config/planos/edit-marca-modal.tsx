"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateMarcaAction } from "@/lib/config/planos/actions/update-marca-action";
import type { Marca } from "@/lib/config/planos/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  marca: Marca;
}

export function EditMarcaModal({ open, onClose, marca }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(marca.nome);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNome(marca.nome);
  }, [marca]);

  function handleSubmit() {
    if (nome.trim().length < 2) return toast.error("Nome muito curto");

    startTransition(async () => {
      const r = await updateMarcaAction({ id: marca.id, nome });
      if (r.success) {
        toast.success("Marca atualizada");
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
            className="elevation-3 w-full max-w-md rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                Editar marca
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

            <div>
              <label className="ds-mono-sm text-muted-foreground mb-1 block">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-body w-full rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
                autoFocus
              />
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
