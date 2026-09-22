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
      toast.error("Meta inválida", { description: "Use o formato MM:SS, ex.: 12:11" });
      return;
    }

    startTransition(async () => {
      const [resultMeta, resultOrdem] = await Promise.all([
        saveTmaMetaAction(valor),
        saveConfigTabelaTmaAction(ordem),
      ]);

      if (resultMeta.success && resultOrdem.success) {
        toast.success("Configurações salvas");
        onSaved(valor, ordem);
        setOpen(false);
      } else {
        toast.error("Erro ao salvar", {
          description: (!resultMeta.success && resultMeta.error) || (!resultOrdem.success && resultOrdem.error) || undefined,
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
            title="Configurar meta do TMA"
            aria-label="Configurar meta do TMA"
            className="bg-primary text-primary-foreground hover:opacity-90 flex cursor-pointer items-center justify-center rounded-md p-2 shadow-sm transition-opacity disabled:opacity-50"
          >
            <IconSettings size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-84 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl space-y-3"
        >
          <PopoverHeader className="border-b border-border/50 pb-2">
            <PopoverTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <IconSettings size={15} className="text-muted-foreground" />
              Configurações da Tabela
            </PopoverTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Define a meta e a ordenação da equipe
            </p>
          </PopoverHeader>

          <div className="space-y-1.5">
            <Label htmlFor="config-meta-tma" className="ds-mono-sm text-xs font-medium text-foreground/90">
              Meta do TMA (MM:SS)
            </Label>
            <Input
              id="config-meta-tma"
              type="text"
              placeholder="MM:SS"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              className="h-8 border-border bg-background px-2 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Define o corte vermelho/verde da tabela (menor é melhor)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="config-ordem-tma" className="ds-mono-sm text-xs font-medium text-foreground/90">
              Ordenação dos Operadores
            </Label>
            <div className="relative">
              <button
                type="button"
                id="config-ordem-tma"
                disabled={isPending}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 focus:outline-none transition-all cursor-pointer"
              >
                <span>{selectedOption?.label ?? "Selecione..."}</span>
                <IconChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-border/80 bg-popover p-1 shadow-2xl">
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
                          "w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "text-foreground hover:bg-muted/60"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {isPending ? (
              <>
                <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <IconCheck size={14} aria-hidden="true" />
                <span>Salvar meta</span>
              </>
            )}
          </Button>
        </PopoverContent>
      </Popover>
    </>
  );
}
