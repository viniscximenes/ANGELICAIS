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
import { saveConfigTabelaTmaAction } from "@/lib/gestor/config-tabela-tma/actions/save-config-tabela-tma-action";
import { ORDEM_TABELA_TMA_OPTIONS, type OrdemTabelaTma } from "@/lib/gestor/config-tabela-tma/types";
import { metaTmaValida } from "@/lib/tma/tma-status-pure";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

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
    // Campo vazio = sem meta própria: remove o override e volta a valer a
    // meta padrão do KPI (kpi_definitions). Antes o vazio era recusado, e
    // quem não tinha meta não conseguia salvar nem a ordenação.
    if (valor !== "" && !metaTmaValida(valor)) {
      toast.error("Meta inválida", {
        description: "Use MM:SS, segundos de 00 a 59 e maior que 00:00 (ex.: 13:00), ou deixe vazio pra usar a meta padrão",
        className: "toast-padrao",
      });
      return;
    }

    startTransition(async () => {
      // try/catch como no ConfigTabelaPopover do Consolidado: uma action de
      // build anterior (deploy com a aba aberta) ou falha de rede rejeita a
      // promise — sem isto o erro subia até o error boundary, sem aviso.
      try {
        // Meta e ordenação numa action só (um upsert): grava as duas ou
        // nenhuma — antes eram duas em paralelo e uma podia ficar gravada
        // sem a tela refletir.
        const result = await saveConfigTabelaTmaAction(valor === "" ? null : valor, ordem);

        if (result.success) {
          toast.success("Configurações salvas", { className: "toast-padrao" });
          onSaved(valor, ordem);
          setOpen(false);
          onOpenChange?.(false);
        } else {
          toast.error("Erro ao salvar", {
            description: result.error,
            className: "toast-padrao",
          });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao salvar", { className: "toast-padrao" });
        console.error("[ConfigTmaPopover] erro:", err);
      }
    });
  }

  const selectedOption = ORDEM_TABELA_TMA_OPTIONS.find((opt) => opt.value === ordem);

  // Seletor de ordenação (listbox) — mesmo do ConfigTabelaPopover do
  // Consolidado: foco vai para a opção marcada ao abrir e volta para o botão
  // ao escolher/Esc.
  const metaInputRef = useRef<HTMLInputElement>(null);
  const ordemBotaoRef = useRef<HTMLButtonElement>(null);
  const ordemOpcoesRef = useRef<(HTMLButtonElement | null)[]>([]);

  function abrirOrdem() {
    setDropdownOpen(true);
    const i = Math.max(0, ORDEM_TABELA_TMA_OPTIONS.findIndex((opt) => opt.value === ordem));
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
            // (ConfigTabelaPopover): outline neutro h-8/w-8, sem preenchimento.
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="reports-tma-peso"
          align="end"
          // O Radix focaria E selecionaria o valor da meta. Em vez de só
          // cancelar (o foco ficava fora do popover e o teclado não chegava
          // aos campos), o foco vai pro campo da meta com o cursor no fim,
          // sem selecionar o texto.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const input = metaInputRef.current;
            if (!input) return;
            input.focus({ preventScroll: true });
            input.setSelectionRange(input.value.length, input.value.length);
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
                ref={metaInputRef}
                id="config-meta-tma"
                type="text"
                placeholder="Padrão do KPI"
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
              <Label id="config-ordem-tma-label" htmlFor="config-ordem-tma" className="text-foreground text-xs font-medium">
                Ordenação dos Operadores
              </Label>
              {/* Seletor no padrão listbox (WAI-ARIA), igual ao do Consolidado:
                  botão anuncia aberto/fechado e a lista; ↑/↓/Home/End movem
                  entre as opções, Enter/Espaço escolhem, Esc fecha só o
                  seletor (onEscapeKeyDown no PopoverContent) e Tab sai
                  fechando. Clique fora do seletor (foco saindo dele) também
                  fecha. */}
              <div
                className="relative"
                onBlur={(e) => {
                  if (dropdownOpen && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDropdownOpen(false);
                  }
                }}
              >
                <button
                  ref={ordemBotaoRef}
                  type="button"
                  id="config-ordem-tma"
                  disabled={isPending}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-controls={dropdownOpen ? "config-ordem-tma-lista" : undefined}
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
                    id="config-ordem-tma-lista"
                    role="listbox"
                    aria-labelledby="config-ordem-tma-label"
                    onKeyDown={handleOrdemListaKeyDown}
                    className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-2xl"
                  >
                    {ORDEM_TABELA_TMA_OPTIONS.map((opt, i) => {
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
