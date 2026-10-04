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
import { TEMAS_META, metaDoTema, type MetasTemas } from "@/lib/coordenador/types";
import { DEFAULT_META_TX_RETENCAO } from "@/lib/gestor/config-tabela/types";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

/**
 * Engrenagem de meta do polo — mesmo visual do ConfigTabelaPopover de
 * /s/reports/consolidado (botão outline h-8/w-8, overlay com blur, popover
 * rounded-2xl), com a meta do polo e as metas por tema (mesma lista do
 * "Metas por Tema" do /s). Ao salvar, recarrega os dados do
 * Server Component (cores e lista de baixo rendimento dependem da meta).
 */
export function ConfigMetaPoloPopover({
  metaInicial,
  metasTemasIniciais,
  onOpenChange,
}: {
  metaInicial: number;
  /** Metas por tema salvas; tema sem valor aparece com a meta do polo. */
  metasTemasIniciais: MetasTemas;
  /** Avisa o pai ao abrir/fechar — usado pra elevar os cards de taxa acima do desfoque. */
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(String(metaInicial));
  const [metasTemas, setMetasTemas] = useState<Record<string, string>>(() => temasComoTexto());
  const [isPending, startTransition] = useTransition();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function temasComoTexto(): Record<string, string> {
    return Object.fromEntries(
      TEMAS_META.map((tema) => [tema, String(metaDoTema(tema, metasTemasIniciais, metaInicial))]),
    );
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setMeta(String(metaInicial));
      setMetasTemas(temasComoTexto());
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSave() {
    const valor = Number(meta.replace(",", "."));
    const valoresTemas: MetasTemas = Object.fromEntries(
      TEMAS_META.map((tema) => [tema, Number((metasTemas[tema] ?? "").replace(",", "."))]),
    );

    if ([valor, ...Object.values(valoresTemas)].some((v) => Number.isNaN(v) || v < 0 || v > 100)) {
      toast.error("Meta inválida", {
        description: "Informe um valor entre 0 e 100.",
        className: "reports-consolidado-toast",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveMetaPoloAction(valor, valoresTemas);
        if (result.success) {
          toast.success("Configurações salvas", { className: "reports-consolidado-toast" });
          setOpen(false);
          onOpenChange?.(false);
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
          align="end"
          // Mesmo padrão do ConfigTabelaPopover (/s/reports/consolidado): sem
          // auto-foco (o valor da meta aparecia já selecionado), gap-0 + pt-3.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="bg-popover text-popover-foreground border-border w-72 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase">
              Configurações do Polo
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="meta-polo" className="text-foreground text-xs font-medium">
                Meta Taxa Retenção - Padrão {DEFAULT_META_TX_RETENCAO}%
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="meta-polo"
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

            {/* Metas por tema — mesmo grid do "Metas por Tema" do /s
                (config-metas-popover.tsx). id="meta-<tema>" pega a regra sem
                contorno de foco de reports-consolidado.css. */}
            <div className="space-y-2">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Metas por Tema
              </span>
              <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1 scrollbar-tema">
                {TEMAS_META.map((tema) => (
                  <div key={tema} className="grid grid-cols-[1fr_84px] items-center gap-2 rounded-md px-1 py-1">
                    <Label
                      htmlFor={`meta-${tema}`}
                      className="text-foreground truncate text-xs font-normal"
                      title={tema}
                    >
                      {tema}
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id={`meta-${tema}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={0.1}
                        value={metasTemas[tema] ?? ""}
                        onChange={(e) => setMetasTemas((prev) => ({ ...prev, [tema]: e.target.value }))}
                        disabled={isPending}
                        className="h-7 pr-6 text-center text-xs font-semibold focus-visible:border-input focus-visible:ring-0"
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
