"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createMonitoriaAction } from "@/lib/monitorias/actions/create-monitoria-action";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";
import type { AuxItem } from "@/lib/monitorias/get-aux-operators";
import { getDatePartsInBR } from "@/lib/utils/format-datetime-br";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  operators: OperatorItem[];
  auxOperators: AuxItem[];
}

function getToday(): string {
  const { year, month, day } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getFirstDayOfMonth(): string {
  const { year, month } = getDatePartsInBR();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function NewMonitoriaModal({
  open,
  onClose,
  operators,
  auxOperators,
}: Props) {
  const router = useRouter();
  const [operatorEmail, setOperatorEmail] = useState("");
  const [auxEmail, setAuxEmail] = useState("");
  const [idChamada, setIdChamada] = useState("");
  const [contrato, setContrato] = useState("");
  const [data, setData] = useState(getToday());
  const [link, setLink] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setOperatorEmail("");
    setAuxEmail("");
    setIdChamada("");
    setContrato("");
    setData(getToday());
    setLink("");
  }

  function handleSubmit() {
    if (!operatorEmail) {
      toast.error("Selecione o operador");
      return;
    }
    if (!auxEmail) {
      toast.error("Selecione o AUX responsável");
      return;
    }
    if (!idChamada.trim()) {
      toast.error("Informe o ID da chamada");
      return;
    }
    if (!/^\d+$/.test(contrato.trim())) {
      toast.error("Contrato deve ter apenas números");
      return;
    }
    if (!link.match(/^https?:\/\//)) {
      toast.error("Link deve começar com http:// ou https://");
      return;
    }

    startTransition(async () => {
      const r = await createMonitoriaAction({
        operatorEmail,
        auxResponsibleEmail: auxEmail,
        idChamada,
        contratoCliente: contrato,
        dataAtendimento: data,
        linkOnedrive: link,
      });

      if (r.success) {
        toast.success("Monitoria criada");
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
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="elevation-3 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                Nova monitoria
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Operador alvo
                  </label>
                  <select
                    value={operatorEmail}
                    onChange={(e) => setOperatorEmail(e.target.value)}
                    disabled={isPending}
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{
                      border: "1px solid var(--border)",
                      colorScheme: "dark",
                    }}
                  >
                    <option value="">Selecionar…</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.emailCorporativo}>
                        {op.fullName} ({op.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    AUX responsável
                  </label>
                  <select
                    value={auxEmail}
                    onChange={(e) => setAuxEmail(e.target.value)}
                    disabled={isPending}
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{
                      border: "1px solid var(--border)",
                      colorScheme: "dark",
                    }}
                  >
                    <option value="">Selecionar…</option>
                    {auxOperators.map((a) => (
                      <option key={a.id} value={a.emailCorporativo}>
                        {a.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    ID da chamada
                  </label>
                  <input
                    type="text"
                    value={idChamada}
                    onChange={(e) => setIdChamada(e.target.value)}
                    disabled={isPending}
                    placeholder="ABC123"
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>

                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Contrato (apenas números)
                  </label>
                  <input
                    type="text"
                    value={contrato}
                    onChange={(e) =>
                      setContrato(e.target.value.replace(/\D/g, ""))
                    }
                    disabled={isPending}
                    placeholder="12345678"
                    className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
              </div>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Data do atendimento
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  min={getFirstDayOfMonth()}
                  max={getToday()}
                  disabled={isPending}
                  className="elevation-2 ds-mono date-input-styled w-full rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    colorScheme: "dark",
                  }}
                />
              </div>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Link da gravação (OneDrive)
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={isPending}
                  placeholder="https://..."
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
                {isPending ? "Criando..." : "Criar monitoria"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
