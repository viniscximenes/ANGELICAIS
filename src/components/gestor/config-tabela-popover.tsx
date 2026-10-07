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
import { saveConfigTabelaAction } from "@/lib/gestor/config-tabela/actions/save-config-tabela-action";
import {
  DEFAULT_META_TX_RETENCAO,
  ORDEM_TABELA_OPTIONS,
  type OrdemTabela,
} from "@/lib/gestor/config-tabela/types";
import { TEMAS_META } from "@/lib/retencao/metas-consolidado";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

interface ConfigTabelaPopoverProps {
  metaTxInicial: number;
  ordemInicial: OrdemTabela;
  /** Metas por tema do Analítico (localStorage — o pai persiste no onSaved). */
  themeMetasInicial: Record<string, number>;
  /** Atualiza o estado do pai (GestorEquipeSection) após salvar com sucesso. */
  onSaved: (metaTx: number, ordem: OrdemTabela, themeMetas: Record<string, number>) => void;
  /** Notifica o pai sempre que o popover abre/fecha — usado pra elevar o z-index da tabela acima do blur enquanto o popover está aberto. */
  onOpenChange?: (open: boolean) => void;
}

export function ConfigTabelaPopover({
  metaTxInicial,
  ordemInicial,
  themeMetasInicial,
  onSaved,
  onOpenChange,
}: ConfigTabelaPopoverProps) {
  const [open, setOpen] = useState(false);
  const [metaTx, setMetaTx] = useState(String(metaTxInicial));
  const [ordem, setOrdem] = useState<OrdemTabela>(ordemInicial);
  // Texto cru de cada campo (aceita vazio/vírgula enquanto digita); convertido
  // e validado só no salvar.
  const [temas, setTemas] = useState<Record<string, string>>(() => metasParaTexto(themeMetasInicial));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Portal só depois de montado no client — evita acessar `document` durante
  // o SSR e garante que o overlay cubra o viewport inteiro (position: fixed
  // ficaria preso ao ancestral se algum <motion.section>/<motion.div> da
  // página tiver transform aplicado, que cria um novo containing block).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao reabrir, descarta qualquer edição não salva de uma tentativa anterior
  // e mostra sempre os últimos valores confirmados.
  function handleOpenChange(next: boolean) {
    if (next) {
      setMetaTx(String(metaTxInicial));
      setOrdem(ordemInicial);
      setTemas(metasParaTexto(themeMetasInicial));
      setDropdownOpen(false);
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSave() {
    const valor = Number(metaTx.replace(",", "."));

    // Vazio recusado como nos campos por tema: Number("") é 0 e salvaria
    // meta 0% (equipe toda "dentro da meta") por uma edição incompleta.
    if (metaTx.trim() === "" || Number.isNaN(valor) || valor < 0 || valor > 100) {
      toast.error("Meta inválida", {
        description: "Informe um valor entre 0 e 100.",
        className: "reports-consolidado-toast",
      });
      return;
    }

    const themeMetas: Record<string, number> = {};
    for (const tema of TEMAS_META) {
      const v = Number((temas[tema] ?? "").replace(",", "."));
      if (temas[tema]?.trim() === "" || Number.isNaN(v) || v < 0 || v > 100) {
        toast.error("Meta inválida", {
          description: `${tema}: informe um valor entre 0 e 100.`,
          className: "reports-consolidado-toast",
        });
        return;
      }
      themeMetas[tema] = v;
    }

    startTransition(async () => {
      try {
        // Metas por tema vão ao banco junto com a meta geral (meta_temas).
        const result = await saveConfigTabelaAction(valor, ordem, themeMetas);
        if (result.success) {
          toast.success("Configurações salvas", { className: "reports-consolidado-toast" });
          onSaved(valor, ordem, themeMetas);
          setOpen(false);
          onOpenChange?.(false);
        } else {
          toast.error("Erro ao salvar", {
            description: result.error,
            className: "reports-consolidado-toast",
          });
        }
      } catch (err) {
        if (handleStaleActionError(err)) return;
        toast.error("Erro inesperado ao salvar", { className: "reports-consolidado-toast" });
        console.error("[ConfigTabelaPopover] erro:", err);
      }
    });
  }

  const selectedOption = ORDEM_TABELA_OPTIONS.find((opt) => opt.value === ordem);

  // Seletor de ordenação (listbox): foco vai para a opção marcada ao abrir e
  // volta para o botão ao escolher/Esc.
  const ordemBotaoRef = useRef<HTMLButtonElement>(null);
  const ordemOpcoesRef = useRef<(HTMLButtonElement | null)[]>([]);

  function abrirOrdem() {
    setDropdownOpen(true);
    const i = Math.max(0, ORDEM_TABELA_OPTIONS.findIndex((opt) => opt.value === ordem));
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
            // Mesma família visual do botão de engrenagem de /kpi/operadores
            // (ConfigKpiOperadoresPopover): outline h-8/w-8, sem preenchimento.
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="reports-consolidado"
          align="end"
          // Sem auto-foco ao abrir: o Radix foca (e seleciona) o primeiro
          // campo — o valor da meta aparecia já selecionado.
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Esc com o seletor de ordenação aberto fecha só o seletor (o Radix
          // escuta o Esc no documento, antes do onKeyDown da lista).
          onEscapeKeyDown={(e) => {
            if (dropdownOpen) {
              e.preventDefault();
              fecharOrdem(true);
            }
          }}
          // gap-0 + pt-3: remove o gap-2.5 padrão do PopoverContent (somado
          // ao pt do bloco de campos) e o respiro extra acima do título.
          className="bg-popover text-popover-foreground border-border w-80 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          {/* Cabeçalho enxuto — só o título (subtítulo explicativo removido a
              pedido: card menor, só com o que é útil). Fonte trocada de
              `text-sm font-semibold` (sem font-family própria, dependia de
              herança) pra `ds-h3` — MESMA classe usada nos títulos de card
              do resto da página (ex.: "Retenção por Tema"), que fixa
              font-family: var(--font-sans) explicitamente. */}
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase">
              Configurações da Tabela
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-tx"
                className="text-foreground text-xs font-medium"
              >
                Meta Taxa Retenção - Padrão {DEFAULT_META_TX_RETENCAO}%
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="config-meta-tx"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.1}
                  value={metaTx}
                  onChange={(e) => setMetaTx(e.target.value)}
                  disabled={isPending}
                  // Sem o anel de foco padrão do Input (shared component) —
                  // pedido explícito nesta popover: focus-visible:border-ring/
                  // ring-3 sobrescritos pra manter a borda neutra de sempre.
                  className="pr-8 text-sm font-semibold focus-visible:border-input focus-visible:ring-0"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-bold">%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                id="config-ordem-label"
                htmlFor="config-ordem"
                className="text-foreground text-xs font-medium"
              >
                Ordenação Dos Operadores
              </Label>
              {/* Seletor no padrão listbox (WAI-ARIA): botão anuncia
                  aberto/fechado e a lista; ↑/↓/Home/End movem entre as
                  opções, Enter/Espaço escolhem, Esc fecha só o seletor (ver
                  onEscapeKeyDown no PopoverContent) e Tab sai fechando. */}
              <div className="relative">
                <button
                  ref={ordemBotaoRef}
                  type="button"
                  id="config-ordem"
                  disabled={isPending}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-controls={dropdownOpen ? "config-ordem-lista" : undefined}
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
                    id="config-ordem-lista"
                    role="listbox"
                    aria-labelledby="config-ordem-label"
                    onKeyDown={handleOrdemListaKeyDown}
                    className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-2xl"
                  >
                    {ORDEM_TABELA_OPTIONS.map((opt, i) => {
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

            {/* Metas por tema — antes no "Configurações de Metas" do
                Analítico (engrenagem removida); a meta geral é a de cima. */}
            <div className="space-y-1.5">
              <span className="text-foreground block text-xs font-medium">Metas por Tema</span>
              <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1 scrollbar-tema">
                {TEMAS_META.map((tema) => (
                  <div key={tema} className="grid grid-cols-[1fr_84px] items-center gap-2 px-1 py-0.5">
                    <Label
                      htmlFor={idMetaTema(tema)}
                      className="text-muted-foreground truncate text-xs font-normal"
                      title={tema}
                    >
                      {tema}
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id={idMetaTema(tema)}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={0.1}
                        value={temas[tema] ?? ""}
                        onChange={(e) => setTemas((prev) => ({ ...prev, [tema]: e.target.value }))}
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

function metasParaTexto(metas: Record<string, number>): Record<string, string> {
  return Object.fromEntries(TEMAS_META.map((tema) => [tema, String(metas[tema] ?? 60)]));
}

/**
 * id válido em HTML para o campo de meta de um tema ("Mot. Financeiro" →
 * "meta-mot-financeiro"): antes era `meta-${tema}`, com espaço (id inválido).
 * Mantém o prefixo "meta-" — o CSS da rota seleciona por input[id^="meta-"].
 */
function idMetaTema(tema: string): string {
  const slug = tema
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `meta-${slug}`;
}
