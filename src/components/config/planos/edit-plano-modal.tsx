"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updatePlanoAction } from "@/lib/config/planos/actions/update-plano-action";
import type { PlanoWithMarca } from "@/lib/config/planos/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  plano: PlanoWithMarca;
}

function parseValorBR(v: string): number {
  const normalized = v.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return isNaN(n) ? 0 : n;
}

function formatValorBR(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function EditPlanoModal({ open, onClose, plano }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(plano.nome);
  const [valorStr, setValorStr] = useState(formatValorBR(plano.valor));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNome(plano.nome);
    setValorStr(formatValorBR(plano.valor));
  }, [plano]);

  function handleSubmit() {
    if (nome.trim().length < 1) return toast.error("Nome obrigatório");
    const valor = parseValorBR(valorStr);
    if (valor <= 0) return toast.error("Valor deve ser maior que zero");

    startTransition(async () => {
      const r = await updatePlanoAction({
        id: plano.id,
        nome,
        valor,
        temOtt: false,
      });
      if (r.success) {
        toast.success("Plano atualizado");
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
                Editar plano
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
                  Marca (não editável)
                </label>
                <div
                  className="elevation-2 ds-mono-sm text-muted-foreground rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {plano.marcaNome}
                </div>
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

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorStr}
                  onChange={(e) => setValorStr(e.target.value)}
                  disabled={isPending}
                  className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                />
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
