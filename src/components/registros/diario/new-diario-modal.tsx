"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createDiarioAction } from "@/lib/diario/actions/create-diario-action";
import { updateDiarioAction } from "@/lib/diario/actions/update-diario-action";
import {
  calcDeltaFromJornada,
  formatSecondsAsHHMMSS,
  JORNADA_SEGUNDOS,
} from "@/lib/diario/time-format";
import { CASO_OPTIONS } from "@/lib/diario/types";
import type { DiarioCaso, DiarioRegistro } from "@/lib/diario/types";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";

import { DiarioTimeInput } from "./diario-time-input";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  operators: OperatorItem[];
  editingRegistro?: DiarioRegistro;
}

function getToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function getFirstDayOfCurrentMonth(): string {
  const today = getToday();
  return `${today.slice(0, 7)}-01`;
}

export function NewDiarioModal({
  open,
  onClose,
  operators,
  editingRegistro,
}: Props) {
  const router = useRouter();
  const isEditing = !!editingRegistro;

  const [operatorEmail, setOperatorEmail] = useState(
    editingRegistro?.operatorEmail ?? "",
  );
  const [caso, setCaso] = useState<DiarioCaso>(
    editingRegistro?.caso ?? "pausa_autorizada",
  );
  const [data, setData] = useState(
    editingRegistro?.dataOcorrido ?? getToday(),
  );
  const [tempoSegundos, setTempoSegundos] = useState<number | null>(
    editingRegistro?.tempoSegundos ?? null,
  );
  const [tempoLogado, setTempoLogado] = useState<number | null>(
    editingRegistro?.tempoLogadoSegundos ?? null,
  );
  const [glpi, setGlpi] = useState(editingRegistro?.glpi ?? "");
  const [descricao, setDescricao] = useState(editingRegistro?.descricao ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (editingRegistro) {
      setOperatorEmail(editingRegistro.operatorEmail);
      setCaso(editingRegistro.caso);
      setData(editingRegistro.dataOcorrido);
      setTempoSegundos(editingRegistro.tempoSegundos);
      setTempoLogado(editingRegistro.tempoLogadoSegundos);
      setGlpi(editingRegistro.glpi ?? "");
      setDescricao(editingRegistro.descricao);
    }
  }, [editingRegistro]);

  function reset() {
    if (isEditing) return;
    setOperatorEmail("");
    setCaso("pausa_autorizada");
    setData(getToday());
    setTempoSegundos(null);
    setTempoLogado(null);
    setGlpi("");
    setDescricao("");
  }

  function handleSubmit() {
    if (!operatorEmail) return toast.error("Selecione o operador");
    if (!descricao.trim()) return toast.error("Descrição obrigatória");
    if (
      caso === "pausa_autorizada" &&
      (tempoSegundos === null || tempoSegundos <= 0)
    ) {
      return toast.error("Tempo da pausa é obrigatório");
    }
    if (caso === "fora_jornada" && tempoLogado === null) {
      return toast.error("Tempo logado é obrigatório");
    }

    startTransition(async () => {
      const payload = {
        operatorEmail,
        caso,
        dataOcorrido: data,
        tempoSegundos:
          caso === "pausa_autorizada" ||
          caso === "geral" ||
          caso === "outros"
            ? tempoSegundos
            : null,
        tempoLogadoSegundos: caso === "fora_jornada" ? tempoLogado : null,
        glpi: glpi.trim() || null,
        descricao,
      };

      const r = isEditing
        ? await updateDiarioAction({ id: editingRegistro!.id, ...payload })
        : await createDiarioAction(payload);

      if (r.success) {
        toast.success(isEditing ? "Registro atualizado" : "Registro criado");
        reset();
        onClose();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const deltaCalculado =
    caso === "fora_jornada" && tempoLogado !== null
      ? calcDeltaFromJornada(tempoLogado)
      : null;

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
            className="elevation-3 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                {isEditing ? "Editar registro" : "Novo registro"}
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
                  Operador
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
                  Caso
                </label>
                <select
                  value={caso}
                  onChange={(e) => setCaso(e.target.value as DiarioCaso)}
                  disabled={isPending}
                  className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    colorScheme: "dark",
                  }}
                >
                  {CASO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Data do ocorrido
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  min={getFirstDayOfCurrentMonth()}
                  max={getToday()}
                  disabled={isPending}
                  className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    colorScheme: "dark",
                  }}
                />
              </div>

              {caso === "pausa_autorizada" && (
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Tempo da pausa{" "}
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <DiarioTimeInput
                    valueSeconds={tempoSegundos}
                    onChange={setTempoSegundos}
                    disabled={isPending}
                    required
                  />
                </div>
              )}

              {caso === "fora_jornada" && (
                <>
                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Tempo logado{" "}
                      <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <DiarioTimeInput
                      valueSeconds={tempoLogado}
                      onChange={setTempoLogado}
                      disabled={isPending}
                      required
                    />
                    <p className="ds-mono-sm text-muted-foreground mt-1">
                      Jornada esperada:{" "}
                      {formatSecondsAsHHMMSS(JORNADA_SEGUNDOS)}
                    </p>
                  </div>

                  {deltaCalculado !== null && (
                    <div className="elevation-2 rounded-md px-3 py-2.5">
                      <p className="ds-mono-sm text-muted-foreground mb-0.5">
                        Tempo a justificar (calculado)
                      </p>
                      <p
                        className="ds-body"
                        style={{
                          color:
                            deltaCalculado > 0
                              ? "var(--danger)"
                              : "var(--success)",
                        }}
                      >
                        {formatSecondsAsHHMMSS(deltaCalculado)}
                      </p>
                    </div>
                  )}
                </>
              )}

              {(caso === "geral" || caso === "outros") && (
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Tempo (opcional)
                  </label>
                  <DiarioTimeInput
                    valueSeconds={tempoSegundos}
                    onChange={setTempoSegundos}
                    disabled={isPending}
                  />
                  <p className="ds-mono-sm text-muted-foreground mt-1">
                    Deixe 00:00:00 se não houver tempo a registrar.
                  </p>
                </div>
              )}

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Código GLPI (opcional)
                </label>
                <input
                  type="text"
                  value={glpi}
                  onChange={(e) => setGlpi(e.target.value)}
                  disabled={isPending}
                  placeholder="GLPI-12345"
                  className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Descrição <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  disabled={isPending}
                  placeholder="Descreva o ocorrido..."
                  rows={5}
                  className="elevation-2 ds-body w-full resize-y rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    minHeight: "120px",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                  }}
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
                {isPending
                  ? isEditing
                    ? "Salvando..."
                    : "Criando..."
                  : isEditing
                    ? "Salvar"
                    : "Criar registro"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
