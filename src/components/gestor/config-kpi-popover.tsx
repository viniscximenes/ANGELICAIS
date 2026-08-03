"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveKpiColunasAction } from "@/lib/kpi/gestor/save-kpi-colunas-action";
import { cn } from "@/lib/utils";

export interface ColunaKpiDisponivel {
  slug: string;
  label: string;
}

interface ConfigKpiPopoverProps {
  colunasDisponiveis: ColunaKpiDisponivel[];
  colunasIniciais: string[];
  /** Atualiza o estado do pai (KpiEquipeSection) após salvar com sucesso. */
  onSaved: (colunas: string[]) => void;
  /** Notifica o pai sempre que o popover abre/fecha — usado pra elevar o z-index da tabela acima do blur enquanto o popover está aberto. */
  onOpenChange?: (open: boolean) => void;
}

export function ConfigKpiPopover({
  colunasDisponiveis,
  colunasIniciais,
  onSaved,
  onOpenChange,
}: ConfigKpiPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    () => new Set(colunasIniciais),
  );
  const [isPending, startTransition] = useTransition();

  // Portal só depois de montado no client — mesmo motivo do ConfigTabelaPopover.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao reabrir, descarta qualquer edição não salva e mostra a última seleção confirmada.
  function handleOpenChange(next: boolean) {
    if (next) {
      setSelecionadas(new Set(colunasIniciais));
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function toggleColuna(slug: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function handleSelectAll() {
    setSelecionadas(new Set(colunasDisponiveis.map((c) => c.slug)));
  }

  function handleClearAll() {
    setSelecionadas(new Set());
  }

  function handleSave() {
    const colunas = [...selecionadas];

    startTransition(async () => {
      const result = await saveKpiColunasAction(colunas);
      if (result.success) {
        toast.success("Configurações salvas");
        onSaved(colunas);
        setOpen(false);
        onOpenChange?.(false);
      } else {
        toast.error("Erro ao salvar", { description: result.error });
      }
    });
  }

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

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Colunas da tabela"
            className="bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center rounded-md p-2 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
            style={{ fontSize: "12px" }}
          >
            <IconSettings size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-84 rounded-2xl border border-border/80 p-5 shadow-2xl backdrop-blur-md">
          <PopoverHeader className="pb-3 border-b border-border/40">
            <div>
              <PopoverTitle className="text-sm font-semibold text-foreground">Colunas da Tabela</PopoverTitle>
              <p className="text-[11px] text-muted-foreground">Escolha quais KPIs aparecem na tabela e na exportação</p>
            </div>
          </PopoverHeader>

          <div className="space-y-3 pt-4">
            {/* Ações rápidas */}
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-muted-foreground font-mono">
                {selecionadas.size} de {colunasDisponiveis.length} selecionados
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Todos
                </button>
                <span className="text-muted-foreground/40" aria-hidden>·</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Menu de Seleção Estilizado */}
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1 scrollbar-tema">
              {colunasDisponiveis.map((col) => {
                const checked = selecionadas.has(col.slug);
                return (
                  <button
                    key={col.slug}
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleColuna(col.slug)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs transition-all cursor-pointer text-left border",
                      checked
                        ? "bg-primary text-primary-foreground font-semibold border-primary shadow-sm"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span>{col.label}</span>
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

            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <IconCheck size={14} aria-hidden="true" />
                  <span>Salvar</span>
                </>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
