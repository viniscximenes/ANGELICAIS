"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
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
              "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all",
              // Entrada imediata (sem fade), saída mantém os 200ms.
              open ? "opacity-100 duration-0" : "pointer-events-none opacity-0 duration-200",
            )}
          />,
          document.body,
        )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Configurações das colunas"
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        {/* Mesma casca/animação/tipografia do "Configurações da Tabela"
            (@/components/gestor/config-tabela-popover.tsx): w-72, p-4 pt-3,
            gap-0, título ds-h3 uppercase, rótulos text-xs font-medium,
            itens rounded-lg text-xs font-medium, sem auto-foco ao abrir. */}
        <PopoverContent
          data-page="kpi-operadores"
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="bg-popover text-popover-foreground border-border w-80 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase whitespace-nowrap">
              Configurações das Colunas
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <p className="text-foreground text-xs font-medium">
                Colunas da tabela
              </p>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-tema">
                {/* Operador — sempre visível, sempre no topo, não editável. */}
                <div
                  className="w-full flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium border border-border bg-transparent text-muted-foreground"
                  aria-disabled="true"
                >
                  <span className="flex items-center gap-2">
                    <span>Operador</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      (Sempre Visível)
                    </span>
                  </span>
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/50 text-muted-foreground">
                    <IconCheck size={11} strokeWidth={3} aria-hidden="true" />
                  </div>
                </div>

                {listaOrdenada.map((col) => {
                  const posicao = colunasVisiveis.indexOf(col.slug);
                  const checked = posicao !== -1;
                  return (
                    <button
                      key={col.slug}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleColuna(col.slug)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer text-left border",
                        checked
                          ? "bg-primary text-primary-foreground font-semibold border-primary shadow-sm"
                          : "border-border bg-transparent text-foreground hover:bg-accent",
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
                        <IconCheck
                          size={11}
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleLimpar}
                  className="text-primary font-medium cursor-pointer"
                >
                  Limpar
                </button>
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={handleRestaurarPadrao}
                  className="text-primary font-medium cursor-pointer"
                >
                  Restaurar padrão
                </button>
              </div>
            </div>

            {/* ── Colunas de RV ── */}
            <div className="space-y-1.5">
              <p className="text-foreground text-xs font-medium">
                {rvDisponivel
                  ? 'Colunas de RV - Com "Exibir RV" ligado'
                  : "Colunas De RV - Só No Mês Atual"}
              </p>

              <div
                className={cn(
                  "space-y-1.5",
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
                        "w-full flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors border text-left",
                        rvDisponivel ? "cursor-pointer" : "cursor-not-allowed",
                        checked
                          ? "bg-primary text-primary-foreground font-semibold border-primary shadow-sm"
                          : "border-border bg-transparent text-foreground hover:bg-accent",
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
                        <IconCheck
                          size={11}
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
