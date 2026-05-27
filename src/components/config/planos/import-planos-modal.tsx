"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { importPlanosAction } from "@/lib/config/planos/actions/import-planos-action";
import type { Marca, PlanoWithMarca } from "@/lib/config/planos/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  marcaDestino: Marca;
  todasMarcas: Marca[];
  todosPlanos: PlanoWithMarca[];
}

export function ImportPlanosModal({
  open,
  onClose,
  marcaDestino,
  todasMarcas,
  todosPlanos,
}: Props) {
  const router = useRouter();
  const [marcaOrigemId, setMarcaOrigemId] = useState("");
  const [planosSelecionados, setPlanosSelecionados] = useState<Set<string>>(
    new Set(),
  );
  const [isPending, startTransition] = useTransition();

  const marcasDisponiveis = todasMarcas.filter(
    (m) => m.id !== marcaDestino.id && m.isActive,
  );

  const planosOrigem = marcaOrigemId
    ? todosPlanos.filter((p) => p.marcaId === marcaOrigemId && p.isActive)
    : [];

  useEffect(() => {
    setPlanosSelecionados(new Set());
  }, [marcaOrigemId]);

  function togglePlano(id: string) {
    const novoSet = new Set(planosSelecionados);
    if (novoSet.has(id)) {
      novoSet.delete(id);
    } else {
      novoSet.add(id);
    }
    setPlanosSelecionados(novoSet);
  }

  function toggleTodos() {
    if (planosSelecionados.size === planosOrigem.length) {
      setPlanosSelecionados(new Set());
    } else {
      setPlanosSelecionados(new Set(planosOrigem.map((p) => p.id)));
    }
  }

  function handleClose() {
    if (isPending) return;
    setMarcaOrigemId("");
    setPlanosSelecionados(new Set());
    onClose();
  }

  function handleSubmit() {
    if (!marcaOrigemId) return toast.error("Selecione a marca de origem");
    if (planosSelecionados.size === 0)
      return toast.error("Selecione ao menos um plano");

    startTransition(async () => {
      const r = await importPlanosAction({
        marcaOrigemId,
        marcaDestinoId: marcaDestino.id,
        planoIds: Array.from(planosSelecionados),
      });

      if (r.success) {
        toast.success(
          `${r.count} plano(s) importado(s) para ${marcaDestino.nome}`,
        );
        handleClose();
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
            className="elevation-3 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                  Importar planos para {marcaDestino.nome}
                </h2>
                <p className="ds-mono-sm text-muted-foreground mt-1">
                  Os planos selecionados serão duplicados.
                </p>
              </div>
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
              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Marca de origem
                </label>
                <select
                  value={marcaOrigemId}
                  onChange={(e) => setMarcaOrigemId(e.target.value)}
                  disabled={isPending || marcasDisponiveis.length === 0}
                  className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
                  style={{
                    border: "1px solid var(--border)",
                    colorScheme: "dark",
                  }}
                >
                  <option value="">
                    {marcasDisponiveis.length === 0
                      ? "Nenhuma outra marca disponível"
                      : "Selecionar..."}
                  </option>
                  {marcasDisponiveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              {marcaOrigemId && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="ds-mono-sm text-muted-foreground">
                      Planos disponíveis ({planosOrigem.length})
                    </label>
                    {planosOrigem.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleTodos}
                        className="ds-mono-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {planosSelecionados.size === planosOrigem.length
                          ? "Desmarcar todos"
                          : "Marcar todos"}
                      </button>
                    )}
                  </div>

                  {planosOrigem.length === 0 ? (
                    <div
                      className="elevation-2 rounded-md p-4 text-center"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      <p className="ds-mono-sm text-muted-foreground">
                        Esta marca não tem planos ativos.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="elevation-2 overflow-hidden rounded-md"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      {planosOrigem.map((p) => (
                        <label
                          key={p.id}
                          className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <input
                            type="checkbox"
                            checked={planosSelecionados.has(p.id)}
                            onChange={() => togglePlano(p.id)}
                            disabled={isPending}
                            className="shrink-0"
                          />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <span className="ds-body truncate">{p.nome}</span>
                            <span className="ds-mono-sm text-muted-foreground shrink-0">
                              R$ {p.valor.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {planosSelecionados.size > 0 && (
                    <p className="ds-mono-sm text-muted-foreground mt-2">
                      {planosSelecionados.size} plano(s) selecionado(s)
                    </p>
                  )}
                </div>
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
                onClick={handleSubmit}
                disabled={isPending || planosSelecionados.size === 0}
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
                  ? "Importando..."
                  : `Importar${planosSelecionados.size > 0 ? ` (${planosSelecionados.size})` : ""}`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
