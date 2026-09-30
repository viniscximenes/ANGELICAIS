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
import { saveConfigTabelaTempoIndispAction } from "@/lib/gestor/config-tabela-tempo-indisp/actions/save-config-tabela-tempo-indisp-action";
import {
  ORDEM_TABELA_TEMPO_INDISP_OPTIONS,
  type OrdemTabelaTempoIndisp,
} from "@/lib/gestor/config-tabela-tempo-indisp/types";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

interface ConfigTabelaTempoIndispPopoverProps {
  metaIndisponibilidadeInicial: number;
  ordemInicial: OrdemTabelaTempoIndisp;
  /** Atualiza o estado do pai (TempoIndispSection) SÓ depois do save confirmar no servidor — mesmo padrão do ConfigTabelaPopover do consolidado (sem atualização otimista: ele também só aplica após sucesso). */
  onSaved: (metaIndisponibilidade: number, ordem: OrdemTabelaTempoIndisp) => void;
  /** Notifica o pai sempre que o popover abre/fecha — usado pra elevar o z-index da tabela acima do blur enquanto o popover está aberto. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Engrenagem de configurações da tabela unificada Tempo Logado &
 * Indisponibilidade — mesmo componente/padrão visual do ConfigTabelaPopover
 * (consolidado): Popover + backdrop via portal, input numérico de meta,
 * dropdown de ordenação, botão salvar com estados loading/sucesso/erro.
 * Não é o MESMO componente (o do consolidado edita meta de TX + ordenação
 * por retenção; este edita meta de Indisp.% + ordenação por Tempo
 * Logado/Indisp.%) — layout e classes idênticos, conteúdo próprio.
 */
export function ConfigTabelaTempoIndispPopover({
  metaIndisponibilidadeInicial,
  ordemInicial,
  onSaved,
  onOpenChange,
}: ConfigTabelaTempoIndispPopoverProps) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(String(metaIndisponibilidadeInicial));
  const [ordem, setOrdem] = useState<OrdemTabelaTempoIndisp>(ordemInicial);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao reabrir, descarta qualquer edição não salva de uma tentativa anterior
  // e mostra sempre os últimos valores confirmados.
  function handleOpenChange(next: boolean) {
    if (next) {
      setMeta(String(metaIndisponibilidadeInicial));
      setOrdem(ordemInicial);
      setDropdownOpen(false);
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSave() {
    const valor = Number(meta.replace(",", "."));

    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      toast.error("Meta inválida", {
        description: "Informe um valor entre 0 e 100.",
        className: "reports-tempo-indisp-toast",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveConfigTabelaTempoIndispAction(valor, ordem);
        if (result.success) {
          toast.success("Configurações salvas", { className: "reports-tempo-indisp-toast" });
          onSaved(valor, ordem);
          setOpen(false);
          onOpenChange?.(false);
        } else {
          toast.error("Erro ao salvar", {
            description: result.error,
            className: "reports-tempo-indisp-toast",
          });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao salvar", { className: "reports-tempo-indisp-toast" });
        console.error("[ConfigTabelaTempoIndispPopover] erro:", err);
      }
    });
  }

  const selectedOption = ORDEM_TABELA_TEMPO_INDISP_OPTIONS.find((opt) => opt.value === ordem);

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
            // (ConfigTabelaPopover): outline neutro h-8/w-8, sem
            // preenchimento — antes era um botão cheio (bg-primary),
            // destoando do resto da linha de controles.
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="reports-tempo-indisponibilidade"
          align="end"
          // Sem auto-foco ao abrir (mesmo do consolidado): o Radix foca (e
          // seleciona) o primeiro campo.
          onOpenAutoFocus={(e) => e.preventDefault()}
          // gap-0 + pt-3: mesmo espaçamento do ConfigTabelaPopover (consolidado).
          className="bg-popover text-popover-foreground border-border w-72 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          {/* Cabeçalho + divisória: mesmo padrão do ConfigTabelaPopover
              (consolidado), que por sua vez segue o modal de referência
              "Configurações de Metas" (config-metas-popover.tsx). */}
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase">
              Configurações da Tabela
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-indisp"
                className="text-foreground text-xs font-medium"
              >
                Meta Indisp. % - Padrão 14,5%
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="config-meta-indisp"
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

            <div className="space-y-1.5">
              <Label
                htmlFor="config-ordem-tempo-indisp"
                className="text-foreground text-xs font-medium"
              >
                Ordenação Dos Operadores
              </Label>
              <div className="relative">
                <button
                  type="button"
                  id="config-ordem-tempo-indisp"
                  disabled={isPending}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="border-border bg-transparent text-foreground w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus:outline-none cursor-pointer"
                >
                  <span>{selectedOption?.label ?? "Selecione..."}</span>
                  <IconChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-2xl">
                    {ORDEM_TABELA_TEMPO_INDISP_OPTIONS.map((opt) => {
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
