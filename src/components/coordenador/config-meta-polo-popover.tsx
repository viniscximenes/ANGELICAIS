"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconCheck, IconLoader2, IconSettings } from "@tabler/icons-react";
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
import { saveMetaPoloAction } from "@/lib/coordenador/save-meta-polo-action";
import { DEFAULT_META_TX_RETENCAO } from "@/lib/gestor/config-tabela/types";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

/**
 * Engrenagem de meta do polo — mesmo visual do ConfigTabelaPopover de
 * /reports/consolidado (botão outline h-8/w-8, overlay com blur, popover
 * rounded-2xl), só com o campo de meta. Ao salvar, recarrega os dados do
 * Server Component (cores e lista de baixo rendimento dependem da meta).
 */
export function ConfigMetaPoloPopover({ metaInicial }: { metaInicial: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(String(metaInicial));
  const [isPending, startTransition] = useTransition();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleOpenChange(next: boolean) {
    if (next) setMeta(String(metaInicial));
    setOpen(next);
  }

  function handleSave() {
    const valor = Number(meta.replace(",", "."));

    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      toast.error("Meta inválida", {
        description: "Informe um valor entre 0 e 100.",
        className: "reports-consolidado-toast",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveMetaPoloAction(valor);
        if (result.success) {
          toast.success("Meta do polo salva", { className: "reports-consolidado-toast" });
          setOpen(false);
          router.refresh();
        } else {
          toast.error("Erro ao salvar", {
            description: result.error,
            className: "reports-consolidado-toast",
          });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao salvar", { className: "reports-consolidado-toast" });
        console.error("[ConfigMetaPoloPopover] erro:", err);
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
            aria-label="Configurar meta do polo"
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="reports-consolidado"
          align="start"
          className="bg-popover text-popover-foreground border-border w-72 rounded-2xl border p-4 shadow-2xl"
        >
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground">
              Configurações do Polo
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-polo"
                className="text-foreground text-xs font-medium flex items-center justify-between"
              >
                <span>Meta TX Retenção</span>
                <span className="text-muted-foreground text-[10px]">
                  Padrão: {DEFAULT_META_TX_RETENCAO.toFixed(1)}%
                </span>
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="config-meta-polo"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.1}
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                  disabled={isPending}
                  className="pr-8 text-sm font-semibold focus-visible:border-input focus-visible:ring-0"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-bold">%</span>
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
