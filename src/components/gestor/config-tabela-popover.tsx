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
      });
      return;
    }

    startTransition(async () => {
      const result = await saveConfigTabelaAction(valor, ordem);
      if (result.success) {
        toast.success("Configurações salvas");
        onSaved(valor, ordem);
        setOpen(false);
        onOpenChange?.(false);
      } else {
        toast.error("Erro ao salvar", { description: result.error });
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
              <p className="text-[11px] text-muted-foreground">Personalize metas e ordenação da equipe</p>
            </div>
          </PopoverHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="config-meta-tx"
                className="ds-mono-sm text-xs font-medium text-foreground/90 flex items-center justify-between"
              >
                <span>Meta TX Retenção</span>
                <span className="text-[10px] text-muted-foreground">Padrão: 65.0%</span>
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
                  className="pr-8 rounded-xl border-border/80 bg-muted/30 focus:bg-background text-sm font-semibold transition-all"
                />
                <span className="absolute right-3 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="config-ordem"
                className="ds-mono-sm text-xs font-medium text-foreground/90"
              >
                Ordenação dos Operadores
              </Label>
              <div className="relative">
                <button
                  type="button"
                  id="config-ordem"
                  disabled={isPending}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 focus:outline-none transition-all cursor-pointer"
                >
                  <span>{selectedOption?.label ?? "Selecione..."}</span>
                  <IconChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-border/80 bg-popover p-1 shadow-2xl">
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
              <div className="flex items-start gap-1.5 pt-0.5 text-[11px] text-muted-foreground/80">
                <IconInfoCircle size={13} className="shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
                <span>Operadores sem atendimento no dia permanecem no final da listagem.</span>
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
