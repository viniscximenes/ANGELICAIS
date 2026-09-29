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
            aria-label="Configurações de metas"
            // Mesma família visual do botão de engrenagem do cabeçalho
            // principal da página (ConfigTabelaPopover): outline h-8/w-8,
            // sem preenchimento — ver config-tabela-popover.tsx.
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="reports-consolidado"
          align="end"
          // Mesmas regras do "Configurações da Tabela": sem auto-foco ao abrir
          // (o Radix focava e SELECIONAVA o valor da Meta Geral) e sem o
          // gap-2.5 padrão do PopoverContent / respiro extra acima do título.
          onOpenAutoFocus={(e) => e.preventDefault()}
          // z-[60]: a seção do gráfico sobe pra z-50 (acima do blur) enquanto
          // o popover está aberto — com o mesmo z-50 ela cobria o card.
          className="bg-popover text-popover-foreground border-border z-[60] w-72 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          {/* Cabeçalho enxuto — só o título (subtítulo explicativo removido a
              pedido: card menor, só com o que é útil). Fonte trocada de
              `text-sm font-semibold` (sem font-family própria) pra `ds-h3` —
              MESMA classe usada nos títulos de card do resto da página (ex.:
              "Retenção por Tema"), que fixa font-family: var(--font-sans)
              explicitamente, em vez de depender de herança. */}
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase">
              Configurações de Metas
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            {/* Meta global — rótulo "(Polo)"/"Equipe" removido a pedido (é a
                meta da equipe, redundante dizer isso aqui). */}
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-global"
                className="text-foreground text-xs font-medium"
              >
                Meta Geral
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
                  // Sem o anel de foco padrão do Input (shared component) —
                  // mesmo ajuste do popover "Configurações da Tabela".
                  className="pr-8 text-sm font-semibold focus-visible:border-input focus-visible:ring-0"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-bold">
                  %
                </span>
              </div>
            </div>

            {/* Metas por tema — grid com colunas alinhadas, mesmo padrão da
                lista do modal de referência (kpi-gestor-metas-popover.tsx). */}
            <div className="space-y-2">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Metas por Tema
              </span>
              <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1 scrollbar-tema">
                {TEMAS.map((tema) => (
                  <div
                    key={tema}
                    // Sem hover na linha (mesma regra do seletor de ordenação
                    // do "Configurações da Tabela").
                    className="grid grid-cols-[1fr_84px] items-center gap-2 rounded-md px-1 py-1"
                  >
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
                        value={localThemes[tema] !== undefined ? localThemes[tema] : 60}
                        onChange={(e) => handleThemeChange(tema, e.target.value)}
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <IconCheck size={14} aria-hidden="true" />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
