"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconSettings } from "@tabler/icons-react";

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
import { cn } from "@/lib/utils";

/** Mesmos temas do card antigo — a lista não muda. */
const TEMAS = [
  "Mot. Financeiro",
  "Ins. Atendimento",
  "Ins. Serviço",
  "Mud. Endereço",
  "Mud. Provedora",
  "Outros",
] as const;

interface ConfigMetasPopoverProps {
  metaGlobal: number;
  themeMetas: Record<string, number>;
  /** Mesma assinatura do card antigo — a persistência não muda. */
  onSave: (global: number, themes: Record<string, number>) => void;
  /** Notifica o pai pra elevar o gráfico acima do blur enquanto aberto. */
  onOpenChange?: (open: boolean) => void;
}

export function ConfigMetasPopover({
  metaGlobal,
  themeMetas,
  onSave,
  onOpenChange,
}: ConfigMetasPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localGlobal, setLocalGlobal] = useState(String(metaGlobal));
  const [localThemes, setLocalThemes] = useState<Record<string, number>>(themeMetas);

  // Portal só depois de montado no client — evita tocar `document` no SSR e
  // garante que o overlay cubra o viewport inteiro mesmo com ancestrais que
  // tenham transform (PageTransition cria containing block).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao reabrir, descarta edição não salva e mostra os últimos valores.
  function handleOpenChange(next: boolean) {
    if (next) {
      setLocalGlobal(String(metaGlobal));
      setLocalThemes(themeMetas);
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleThemeChange(key: string, val: string) {
    const num = parseFloat(val);
    setLocalThemes((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  }

  function handleSave() {
    const valor = parseFloat(localGlobal.replace(",", ".")) || 0;
    // O toast fica por conta do onSave do pai (handleSaveMetas), como antes.
    onSave(valor, localThemes);
    setOpen(false);
    onOpenChange?.(false);
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
            title="Configurações de metas"
            aria-label="Configurações de metas"
            className="bg-primary text-primary-foreground hover:opacity-90 flex cursor-pointer items-center justify-center rounded-md p-2 shadow-sm transition-opacity"
          >
            <IconSettings size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="border-border/80 w-84 rounded-2xl border p-5 shadow-2xl backdrop-blur-md"
        >
          <PopoverHeader className="border-border/40 border-b pb-3">
            <div>
              <PopoverTitle className="text-foreground text-sm font-semibold">
                Configurações de Metas
              </PopoverTitle>
              <p className="text-muted-foreground text-[11px]">
                Defina as metas da taxa de retenção global (polo) e de cada tema.
              </p>
            </div>
          </PopoverHeader>

          <div className="space-y-4 pt-4">
            {/* Meta global */}
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-global"
                className="ds-mono-sm text-foreground/90 text-xs font-medium"
              >
                Meta Global (Polo)
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="config-meta-global"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.1}
                  value={localGlobal}
                  onChange={(e) => setLocalGlobal(e.target.value)}
                  className="border-border/80 bg-muted/30 focus:bg-background rounded-xl pr-8 text-sm font-semibold transition-all"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-bold">
                  %
                </span>
              </div>
            </div>

            {/* Metas por tema */}
            <div className="space-y-2">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Metas por Tema
              </span>
              <div className="space-y-2">
                {TEMAS.map((tema) => (
                  <div key={tema} className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor={`meta-${tema}`}
                      className="text-muted-foreground truncate text-xs font-normal"
                    >
                      {tema}
                    </Label>
                    <div className="relative flex w-24 shrink-0 items-center">
                      <Input
                        id={`meta-${tema}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={0.1}
                        value={localThemes[tema] !== undefined ? localThemes[tema] : 60}
                        onChange={(e) => handleThemeChange(tema, e.target.value)}
                        className="border-border/80 bg-muted/30 focus:bg-background rounded-xl pr-6 text-center text-xs font-semibold transition-all"
                      />
                      <span className="text-muted-foreground pointer-events-none absolute right-2 text-[10px] font-bold">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/20 mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold shadow-md transition-all"
            >
              <IconCheck size={14} aria-hidden="true" />
              <span>Salvar Metas</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
