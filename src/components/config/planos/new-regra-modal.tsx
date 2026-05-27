"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createRegraAction } from "@/lib/config/planos/actions/create-regra-action";
import { validateRegra } from "@/lib/config/planos/validate-regra";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewRegraModal({ open, onClose }: Props) {
  const router = useRouter();
  const [tempoMin, setTempoMin] = useState("0");
  const [semLimiteSuperior, setSemLimiteSuperior] = useState(false);
  const [tempoMax, setTempoMax] = useState("");
  const [descontoMax, setDescontoMax] = useState("");
  const [duracao, setDuracao] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setTempoMin("0");
    setSemLimiteSuperior(false);
    setTempoMax("");
    setDescontoMax("");
    setDuracao("");
  }

  function handleClose() {
    if (isPending) return;
    reset();
    onClose();
  }

  function handleSubmit() {
    const min = parseInt(tempoMin, 10);
    const max = semLimiteSuperior ? null : parseInt(tempoMax, 10);
    const desc = parseInt(descontoMax, 10);
    const dur = parseInt(duracao, 10);

    if (isNaN(min) || (max !== null && isNaN(max)) || isNaN(desc) || isNaN(dur)) {
      return toast.error("Todos os campos numéricos são obrigatórios");
    }

    const validation = validateRegra({
      tempoMinMeses: min,
      tempoMaxMeses: max,
      descontoMaxPct: desc,
      duracaoMeses: dur,
    });
    if (!validation.valid) return toast.error(validation.error);

    startTransition(async () => {
      const r = await createRegraAction({
        temOtt: false,
        tempoMinMeses: min,
        tempoMaxMeses: max,
        descontoMaxPct: desc,
        duracaoMeses: dur,
      });
      if (r.success) {
        toast.success("Regra criada");
        reset();
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
          onClick={handleClose}
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
                Nova regra de desconto
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Tempo mín. (meses)
                  </label>
                  <input
                    type="number"
                    value={tempoMin}
                    onChange={(e) => setTempoMin(e.target.value)}
                    disabled={isPending}
                    min={0}
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Tempo máx. (meses)
                  </label>
                  <input
                    type="number"
                    value={tempoMax}
                    onChange={(e) => setTempoMax(e.target.value)}
                    disabled={isPending || semLimiteSuperior}
                    min={0}
                    placeholder={semLimiteSuperior ? "sem limite" : ""}
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={semLimiteSuperior}
                  onChange={(e) => setSemLimiteSuperior(e.target.checked)}
                  disabled={isPending}
                />
                <span className="ds-body">Sem limite superior</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Desconto máx (%)
                  </label>
                  <input
                    type="number"
                    value={descontoMax}
                    onChange={(e) => setDescontoMax(e.target.value)}
                    disabled={isPending}
                    min={1}
                    max={100}
                    placeholder="30"
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Duração (meses)
                  </label>
                  <input
                    type="number"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    disabled={isPending}
                    min={1}
                    placeholder="6"
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
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
                {isPending ? "Criando..." : "Criar regra"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
