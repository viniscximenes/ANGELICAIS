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
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveConfigTabelaTempoIndispAction(valor, ordem);
        if (result.success) {
          toast.success("Configurações salvas");
          onSaved(valor, ordem);
          setOpen(false);
          onOpenChange?.(false);
        } else {
          toast.error("Erro ao salvar", { description: result.error });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao salvar");
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
            title="Configurações da tabela"
            className="bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center rounded-md p-2 transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
            style={{ fontSize: "12px" }}
          >
            <IconSettings size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-84 rounded-2xl border border-border/80 p-5 shadow-2xl backdrop-blur-md">
          <PopoverHeader className="pb-3 border-b border-border/40">
            <div>
              <PopoverTitle className="text-sm font-semibold text-foreground">Configurações da Tabela</PopoverTitle>
              <p className="text-[11px] text-muted-foreground">Personalize meta e ordenação da equipe</p>
            </div>
          </PopoverHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-indisp"
                className="ds-mono-sm text-xs font-medium text-foreground/90 flex items-center justify-between"
              >
                <span>Meta Indisp. %</span>
                <span className="text-[10px] text-muted-foreground">Padrão: 14.5%</span>
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
                  className="pr-8 rounded-xl border-border/80 bg-muted/30 focus:bg-background text-sm font-semibold transition-all"
                />
                <span className="absolute right-3 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="config-ordem-tempo-indisp"
                className="ds-mono-sm text-xs font-medium text-foreground/90"
              >
                Ordenação dos Operadores
              </Label>
              <div className="relative">
                <button
                  type="button"
                  id="config-ordem-tempo-indisp"
                  disabled={isPending}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 focus:outline-none transition-all cursor-pointer"
                >
                  <span>{selectedOption?.label ?? "Selecione..."}</span>
                  <IconChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-border/80 bg-popover p-1 shadow-2xl">
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
