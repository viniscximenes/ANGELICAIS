"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

import { TOAST_CLASS } from "./constantes";

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

    // Vazio recusado (mesma regra do ConfigTabelaPopover do Consolidado):
    // Number("") é 0 e salvaria meta 0% (equipe toda "acima da meta") por
    // uma edição incompleta.
    if (meta.trim() === "" || Number.isNaN(valor) || valor < 0 || valor > 100) {
      toast.error("Meta inválida", {
        description: "Informe um valor entre 0 e 100.",
        className: TOAST_CLASS,
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveConfigTabelaTempoIndispAction(valor, ordem);
        if (result.success) {
          toast.success("Configurações salvas", { className: TOAST_CLASS });
          onSaved(valor, ordem);
          setOpen(false);
          onOpenChange?.(false);
        } else {
          toast.error("Erro ao salvar", {
            description: result.error,
            className: TOAST_CLASS,
          });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao salvar", { className: TOAST_CLASS });
        console.error("[ConfigTabelaTempoIndispPopover] erro:", err);
      }
    });
  }

  const selectedOption = ORDEM_TABELA_TEMPO_INDISP_OPTIONS.find((opt) => opt.value === ordem);

  // Seletor de ordenação (listbox) — mesmo padrão do ConfigTabelaPopover do
  // Consolidado: foco vai para a opção marcada ao abrir e volta para o botão
  // ao escolher/Esc.
  const ordemBotaoRef = useRef<HTMLButtonElement>(null);
  const ordemOpcoesRef = useRef<(HTMLButtonElement | null)[]>([]);

  function abrirOrdem() {
    setDropdownOpen(true);
    const i = Math.max(0, ORDEM_TABELA_TEMPO_INDISP_OPTIONS.findIndex((opt) => opt.value === ordem));
    requestAnimationFrame(() => ordemOpcoesRef.current[i]?.focus());
  }

  function fecharOrdem(devolverFoco: boolean) {
    setDropdownOpen(false);
    if (devolverFoco) ordemBotaoRef.current?.focus();
  }

  function handleOrdemListaKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const opcoes = ordemOpcoesRef.current.filter((el): el is HTMLButtonElement => el !== null);
    const atual = opcoes.indexOf(document.activeElement as HTMLButtonElement);
    let proximo: number | null = null;
    if (e.key === "ArrowDown") proximo = Math.min(opcoes.length - 1, atual + 1);
    else if (e.key === "ArrowUp") proximo = Math.max(0, atual - 1);
    else if (e.key === "Home") proximo = 0;
    else if (e.key === "End") proximo = opcoes.length - 1;
    else if (e.key === "Tab") setDropdownOpen(false);
    if (proximo !== null) {
      e.preventDefault();
      opcoes[proximo]?.focus();
    }
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
          // O Radix focaria (e selecionaria) o campo da meta. Em vez disso o
          // foco vai para o próprio conteúdo (mesmo padrão do Consolidado):
          // fica DENTRO do popover, então o próximo Tab entra nos campos —
          // antes só cancelava o auto-foco e o foco ficava fora, sem acesso
          // aos controles pelo teclado.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
          }}
          // Esc com o seletor de ordenação aberto fecha só o seletor (o Radix
          // escuta o Esc no documento, antes do onKeyDown da lista).
          onEscapeKeyDown={(e) => {
            if (dropdownOpen) {
              e.preventDefault();
              fecharOrdem(true);
            }
          }}
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
                id="config-ordem-tempo-indisp-label"
                htmlFor="config-ordem-tempo-indisp"
                className="text-foreground text-xs font-medium"
              >
                Ordenação Dos Operadores
              </Label>
              {/* Seletor no padrão listbox (WAI-ARIA), igual ao do Consolidado:
                  botão anuncia aberto/fechado e a lista; ↑/↓/Home/End movem
                  entre as opções, Enter/Espaço escolhem, Esc fecha só o
                  seletor (ver onEscapeKeyDown no PopoverContent) e Tab sai
                  fechando. */}
              <div className="relative">
                <button
                  ref={ordemBotaoRef}
                  type="button"
                  id="config-ordem-tempo-indisp"
                  disabled={isPending}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-controls={dropdownOpen ? "config-ordem-tempo-indisp-lista" : undefined}
                  onClick={() => (dropdownOpen ? fecharOrdem(false) : abrirOrdem())}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      abrirOrdem();
                    }
                  }}
                  className="border-border bg-transparent text-foreground w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus:outline-none cursor-pointer"
                >
                  <span>{selectedOption?.label ?? "Selecione..."}</span>
                  <IconChevronDown size={14} aria-hidden="true" className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div
                    id="config-ordem-tempo-indisp-lista"
                    role="listbox"
                    aria-labelledby="config-ordem-tempo-indisp-label"
                    onKeyDown={handleOrdemListaKeyDown}
                    className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-2xl"
                  >
                    {ORDEM_TABELA_TEMPO_INDISP_OPTIONS.map((opt, i) => {
                      const isSelected = opt.value === ordem;
                      return (
                        <button
                          key={opt.value}
                          ref={(el) => {
                            ordemOpcoesRef.current[i] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={-1}
                          onClick={() => {
                            setOrdem(opt.value);
                            fecharOrdem(true);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
