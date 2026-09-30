"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown, IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveConfigTabelaTmaAction } from "@/lib/gestor/config-tabela-tma/actions/save-config-tabela-tma-action";
import { ORDEM_TABELA_TMA_OPTIONS, type OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import { saveTmaMetaAction } from "@/lib/tma/actions/save-tma-meta-action";
import { cn } from "@/lib/utils";

interface ConfigTmaPopoverProps {
  metaInicial: string; // "MM:SS"
  ordemInicial: OrdemTabelaTma;
  onSaved: (meta: string, ordem: OrdemTabelaTma) => void;
  onOpenChange?: (open: boolean) => void;
}

export function ConfigTmaPopover({ metaInicial, ordemInicial, onSaved, onOpenChange }: ConfigTmaPopoverProps) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(metaInicial);
  const [ordem, setOrdem] = useState<OrdemTabelaTma>(ordemInicial);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Portal só depois de montado no client — evita acessar `document` durante
  // o SSR e garante que o overlay cubra o viewport inteiro (position: fixed
  // ficaria preso ao ancestral se algum <motion.section>/<motion.div> da
  // página tiver transform aplicado, que cria um novo containing block).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleOpenChange(next: boolean) {
    if (next) {
      setMeta(metaInicial);
      setOrdem(ordemInicial);
      setDropdownOpen(false);
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSave() {
    const valor = meta.trim();
    if (!/^\d{1,3}:\d{2}$/.test(valor)) {
      toast.error("Meta inválida", {
        description: "Use o formato MM:SS, ex.: 13:00",
        className: "reports-tma-peso-toast",
      });
      return;
    }

    startTransition(async () => {
      const [resultMeta, resultOrdem] = await Promise.all([
        saveTmaMetaAction(valor),
        saveConfigTabelaTmaAction(ordem),
      ]);

      if (resultMeta.success && resultOrdem.success) {
        toast.success("Configurações salvas", { className: "reports-tma-peso-toast" });
        onSaved(valor, ordem);
        setOpen(false);
        onOpenChange?.(false);
      } else {
        toast.error("Erro ao salvar", {
          description: (!resultMeta.success && resultMeta.error) || (!resultOrdem.success && resultOrdem.error) || undefined,
          className: "reports-tma-peso-toast",
        });
      }
    });
  }

  const selectedOption = ORDEM_TABELA_TMA_OPTIONS.find((opt) => opt.value === ordem);

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
            aria-label="Configurações da tabela"
            // MESMO visual do botão de engrenagem do consolidado
            // (ConfigTabelaPopover): outline neutro h-8/w-8, sem preenchimento.
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="reports-tma-peso"
          align="end"
          // Sem auto-foco ao abrir (mesmo do consolidado): o Radix foca (e
          // seleciona) o primeiro campo.
          onOpenAutoFocus={(e) => e.preventDefault()}
          // gap-0 + pt-3: mesmo espaçamento do ConfigTabelaPopover (consolidado).
          className="bg-popover text-popover-foreground border-border w-72 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          {/* Cabeçalho enxuto — só o título (subtítulo explicativo removido a
              pedido: card menor, só com o que é útil). Fonte trocada pra
              `ds-h3` — MESMA classe usada nos títulos de card do resto da
              página (e no ConfigTabelaPopover do Consolidado), que fixa
              font-family: var(--font-sans) explicitamente. */}
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase">
              Configurações da Tabela
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="config-meta-tma" className="text-foreground text-xs font-medium">
                Meta do TMA (MM:SS)
              </Label>
              <Input
                id="config-meta-tma"
                type="text"
                placeholder="MM:SS"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                disabled={isPending}
                // Sem o anel de foco padrão do Input (shared component) —
                // mesmo ajuste do ConfigTabelaPopover do Consolidado:
                // focus-visible:border-ring/ring-3 sobrescritos pra manter a
                // borda neutra de sempre.
                className="text-sm font-semibold focus-visible:border-input focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="config-ordem-tma" className="text-foreground text-xs font-medium">
                Ordenação dos Operadores
              </Label>
              <div className="relative">
                <button
                  type="button"
                  id="config-ordem-tma"
                  disabled={isPending}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="border-border bg-transparent text-foreground w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus:outline-none cursor-pointer"
                >
                  <span>{selectedOption?.label ?? "Selecione..."}</span>
                  <IconChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-2xl">
                    {ORDEM_TABELA_TMA_OPTIONS.map((opt) => {
                      const isSelected = opt.value === ordem;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setOrdem(opt.value);
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <IconCheck size={14} className="text-primary-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold shadow-sm transition-colors focus-visible:ring-[var(--ring)]"
            >
              {isPending ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <IconCheck size={14} aria-hidden="true" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
