"use client";

import { useState, useTransition } from "react";
import { IconCheck, IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveTmaMetaAction } from "@/lib/tma/actions/save-tma-meta-action";

interface ConfigTmaPopoverProps {
  metaInicial: string; // "MM:SS"
  onSaved: (meta: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export function ConfigTmaPopover({ metaInicial, onSaved, onOpenChange }: ConfigTmaPopoverProps) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(metaInicial);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) setMeta(metaInicial);
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
      const result = await saveTmaMetaAction(valor);
      if (result.success) {
        toast.success("Meta salva");
        onSaved(valor);
        setOpen(false);
      } else {
        toast.error("Erro ao salvar", { description: result.error });
      }
    });
  }

  return (
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
        className="w-[280px] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl space-y-3"
      >
        <PopoverHeader className="border-b border-border/50 pb-2">
          <PopoverTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconSettings size={15} className="text-muted-foreground" />
            Meta do TMA
          </PopoverTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Define o corte vermelho/verde da tabela (menor é melhor)
          </p>
        </PopoverHeader>

        <Input
          type="text"
          placeholder="MM:SS"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          className="h-8 border-border bg-background px-2 font-mono text-xs"
        />

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
  );
}
