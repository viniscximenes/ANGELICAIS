"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Popover as PopoverPrimitive } from "radix-ui";
import { IconCheck, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { saveKpiColunasLocalAction } from "../_lib/save-kpi-colunas-local-action";
import { saveKpiColunasRvAction } from "../_lib/save-kpi-colunas-rv-action";
import {
  RV_COLUNA_LABELS,
  RV_COLUNA_ORDER,
  DEFAULT_RV_COLUNAS,
  type RvColunaId,
} from "../_lib/rv-colunas-config";

export interface ColunaKpiOperadoresDisponivel {
  slug: string;
  label: string;
}

interface ConfigKpiOperadoresPopoverProps {
  /** Todas as colunas selecionáveis (KPIs, sem "Operador"). */
  colunasDisponiveis: ColunaKpiOperadoresDisponivel[];
  /** Ordem ATUAL (fonte da verdade, controlada pelo pai) — array de slugs selecionados, na ordem de exibição. */
  colunasVisiveis: string[];
  /** Padrão do site ("Restaurar padrão") — mesmo default salvo quando [] no banco. */
  colunasDefault: string[];
  /** Chamado a cada alteração (otimista) — o pai atualiza o estado da tabela imediatamente. */
  onColunasChange: (colunas: string[]) => void;

  rvColunasVisiveis: RvColunaId[];
  onRvColunasChange: (colunas: RvColunaId[]) => void;
  /** Só o mês atual suporta RV — seção fica desabilitada (mas visível) fora dele. */
  rvDisponivel: boolean;

  /** Notifica o pai ao abrir/fechar (mesmo motivo do ConfigKpiPopover original — elevar z-index da tabela). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Popover de configuração de colunas de /kpi/operadores — reconstrução local
 * (baseada visualmente em @/components/gestor/config-kpi-popover.tsx,
 * NÃO alterado) com dois comportamentos novos:
 *  1. Seleção define a ORDEM (marcar → entra no fim; desmarcar → sai e as
 *     posições seguintes se reorganizam) — não é mais só um conjunto.
 *  2. Segunda seção, "Colunas de RV", com uma sub-configuração própria
 *     (kpi_colunas_rv).
 * Trigger é só o ícone de engrenagem (⚙) — o texto "Colunas" saiu do botão
 * (era um botão com texto no componente original).
 */
export function ConfigKpiOperadoresPopover({
  colunasDisponiveis,
  colunasVisiveis,
  colunasDefault,
  onColunasChange,
  rvColunasVisiveis,
  onRvColunasChange,
  rvDisponivel,
  onOpenChange,
}: ConfigKpiOperadoresPopoverProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const firstItemRef = useRef<HTMLButtonElement>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
    if (next) {
      requestAnimationFrame(() => firstItemRef.current?.focus());
    }
  }

  // ── Colunas normais (debounce ~400ms, otimista, reverte em erro) ────────
  const lastSavedColunasRef = useRef<string[]>(colunasVisiveis);
  const saveColunasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commitColunas(next: string[]) {
    onColunasChange(next);
    if (saveColunasTimer.current) clearTimeout(saveColunasTimer.current);
    saveColunasTimer.current = setTimeout(() => {
      const paraSalvar = next;
      void saveKpiColunasLocalAction(paraSalvar).then((r) => {
        if (r.success) {
          lastSavedColunasRef.current = paraSalvar;
        } else {
          onColunasChange(lastSavedColunasRef.current);
          toast.error("Erro ao salvar colunas", {
            description: r.error,
            className: "kpi-op-toast",
          });
        }
      });
    }, 400);
  }

  function toggleColuna(slug: string) {
    const jaSelecionado = colunasVisiveis.includes(slug);
    const next = jaSelecionado
      ? colunasVisiveis.filter((s) => s !== slug)
      : [...colunasVisiveis, slug];
    commitColunas(next);
  }

  function handleLimpar() {
    commitColunas([]);
  }

  function handleRestaurarPadrao() {
    commitColunas(colunasDefault);
    commitColunasRv(DEFAULT_RV_COLUNAS);
  }

  // ── Colunas de RV (mesmo padrão de debounce/revert) ─────────────────────
  const lastSavedRvRef = useRef<RvColunaId[]>(rvColunasVisiveis);
  const saveRvTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commitColunasRv(next: RvColunaId[]) {
    onRvColunasChange(next);
    if (saveRvTimer.current) clearTimeout(saveRvTimer.current);
    saveRvTimer.current = setTimeout(() => {
      const isDefault =
        next.length === DEFAULT_RV_COLUNAS.length &&
        DEFAULT_RV_COLUNAS.every((id) => next.includes(id));
      const paraSalvar = isDefault ? null : next;
      void saveKpiColunasRvAction(paraSalvar).then((r) => {
        if (r.success) {
          lastSavedRvRef.current = next;
        } else {
          onRvColunasChange(lastSavedRvRef.current);
          toast.error("Erro ao salvar colunas de RV", {
            description: r.error,
            className: "kpi-op-toast",
          });
        }
      });
    }, 400);
  }

  function toggleColunaRv(id: RvColunaId) {
    const jaSelecionado = rvColunasVisiveis.includes(id);
    const next = jaSelecionado
      ? rvColunasVisiveis.filter((c) => c !== id)
      : [...rvColunasVisiveis, id];
    commitColunasRv(next);
  }

  // Selecionadas primeiro (na ordem salva), não selecionadas depois em ordem alfabética.
  const selecionadas = colunasVisiveis
    .map((slug) => colunasDisponiveis.find((c) => c.slug === slug))
    .filter((c): c is ColunaKpiOperadoresDisponivel => c !== undefined);
  const naoSelecionadas = colunasDisponiveis
    .filter((c) => !colunasVisiveis.includes(c.slug))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const listaOrdenada = [...selecionadas, ...naoSelecionadas];

  return (
    <>
      {mounted &&
        createPortal(
          <div
            aria-hidden="true"
            onClick={() => handleOpenChange(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all duration-200",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />,
          document.body,
        )}

      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Configurar colunas"
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            data-page="kpi-operadores"
            align="end"
            sideOffset={8}
            className="font-sans z-50 w-84 rounded-2xl border border-border/80 bg-popover p-5 text-popover-foreground shadow-2xl outline-none backdrop-blur-md data-[side=bottom]:slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="pb-3 border-b border-border/40">
              <p className="text-sm font-semibold text-foreground">Colunas</p>
              <p className="text-[11px] text-muted-foreground">
                Escolha e ordene os KPIs exibidos na tabela e na exportação
              </p>
            </div>

            <div className="space-y-1.5 pt-3 max-h-72 overflow-y-auto pr-1 scrollbar-tema">
              {/* Operador — sempre visível, sempre no topo, não editável. */}
              <div
                className="w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs border bg-muted/30 border-border/60 text-muted-foreground"
                aria-disabled="true"
              >
                <span className="flex items-center gap-2">
                  <span>Operador</span>
                  <span className="text-[10px] text-muted-foreground/70">(sempre visível)</span>
                </span>
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/50 text-muted-foreground">
                  <IconCheck size={11} strokeWidth={3} aria-hidden="true" />
                </div>
              </div>

              {listaOrdenada.map((col, idx) => {
                const posicao = colunasVisiveis.indexOf(col.slug);
                const checked = posicao !== -1;
                return (
                  <button
                    key={col.slug}
                    ref={idx === 0 ? firstItemRef : undefined}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleColuna(col.slug)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs transition-all cursor-pointer text-left border",
                      checked
                        ? "bg-primary text-primary-foreground font-semibold border-primary shadow-sm"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {checked && (
                        <span
                          aria-label={`posição ${posicao + 1}`}
                          className={cn(
                            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                            "bg-primary-foreground/20 text-primary-foreground",
                          )}
                        >
                          {posicao + 1}
                        </span>
                      )}
                      <span>{col.label}</span>
                    </span>
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-md transition-colors border",
                        checked
                          ? "border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground"
                          : "border-border/60 bg-background/50 text-transparent",
                      )}
                    >
                      <IconCheck size={11} strokeWidth={3} aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2.5 text-[11px]">
              <button
                type="button"
                onClick={handleLimpar}
                className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
              >
                Limpar
              </button>
              <span className="text-muted-foreground/40" aria-hidden>·</span>
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Restaurar padrão
              </button>
            </div>

            {/* ── Colunas de RV ── */}
            <div className="pt-4 mt-3 border-t border-border/40">
              <p className="text-sm font-semibold text-foreground">Colunas de RV</p>
              <p className="text-[11px] text-muted-foreground">
                {rvDisponivel
                  ? "Visíveis só com \"Exibir RV\" ligado"
                  : "RV disponível só no mês atual"}
              </p>

              <div
                className={cn(
                  "space-y-1.5 pt-3",
                  !rvDisponivel && "pointer-events-none opacity-40",
                )}
                aria-disabled={!rvDisponivel}
              >
                {RV_COLUNA_ORDER.map((id) => {
                  const checked = rvColunasVisiveis.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={!rvDisponivel}
                      onClick={() => toggleColunaRv(id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-xs transition-all border text-left",
                        rvDisponivel ? "cursor-pointer" : "cursor-not-allowed",
                        checked
                          ? "bg-primary text-primary-foreground font-semibold border-primary shadow-sm"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span>{RV_COLUNA_LABELS[id]}</span>
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-md transition-colors border",
                          checked
                            ? "border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground"
                            : "border-border/60 bg-background/50 text-transparent",
                        )}
                      >
                        <IconCheck size={11} strokeWidth={3} aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  );
}
