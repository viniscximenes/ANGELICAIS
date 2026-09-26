"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown, IconInfoCircle, IconLoader2, IconSettings } from "@tabler/icons-react";
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
  ORDEM_TABELA_OPTIONS,
  type OrdemTabela,
} from "@/lib/gestor/config-tabela/types";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

interface ConfigTabelaPopoverProps {
  metaTxInicial: number;
  ordemInicial: OrdemTabela;
  /** Atualiza o estado do pai (GestorEquipeSection) após salvar com sucesso. */
  onSaved: (metaTx: number, ordem: OrdemTabela) => void;
  /** Notifica o pai sempre que o popover abre/fecha — usado pra elevar o z-index da tabela acima do blur enquanto o popover está aberto. */
  onOpenChange?: (open: boolean) => void;
}

export function ConfigTabelaPopover({
  metaTxInicial,
  ordemInicial,
  onSaved,
  onOpenChange,
}: ConfigTabelaPopoverProps) {
  const [open, setOpen] = useState(false);
  const [metaTx, setMetaTx] = useState(String(metaTxInicial));
  const [ordem, setOrdem] = useState<OrdemTabela>(ordemInicial);
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
      setDropdownOpen(false);
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSave() {
    const valor = Number(metaTx.replace(",", "."));

    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      toast.error("Meta inválida", {
        description: "Informe um valor entre 0 e 100.",
        className: "reports-consolidado-toast",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveConfigTabelaAction(valor, ordem);
        if (result.success) {
          toast.success("Configurações salvas", { className: "reports-consolidado-toast" });
          onSaved(valor, ordem);
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
          className="bg-popover text-popover-foreground border-border w-84 rounded-2xl border p-5 shadow-2xl"
        >
          {/* Cabeçalho + divisória: mesmo padrão do modal de referência
              "Configurações de Metas" (config-metas-popover.tsx). */}
          <PopoverHeader className="border-border/50 space-y-0.5 border-b pb-2">
            <PopoverTitle className="text-foreground text-sm font-semibold">
              Configurações da Tabela
            </PopoverTitle>
            <p className="text-muted-foreground text-[11px]">
              Ajuste a meta de retenção e a ordenação da tabela.
            </p>
          </PopoverHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-tx"
                className="text-foreground text-xs font-medium flex items-center justify-between"
              >
                <span>Meta TX Retenção</span>
                <span className="text-muted-foreground text-[10px]">Padrão: 65.0%</span>
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
                  className="pr-8 text-sm font-semibold"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-bold">%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="config-ordem"
                className="text-foreground text-xs font-medium"
              >
                Ordenação dos Operadores
              </Label>
              <div className="relative">
                <button
                  type="button"
                  id="config-ordem"
                  disabled={isPending}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="border-border bg-transparent text-foreground hover:bg-accent w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus:outline-none cursor-pointer"
                >
                  <span>{selectedOption?.label ?? "Selecione..."}</span>
                  <IconChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-2xl">
                    {ORDEM_TABELA_OPTIONS.map((opt) => {
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
              <div className="flex items-start gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                <IconInfoCircle size={13} className="shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
                <span>Operadores sem atendimento no dia permanecem no final da listagem.</span>
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
