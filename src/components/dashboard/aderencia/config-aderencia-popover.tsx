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
import type {
  ChaveHoraAderencia,
  ConfigAderencia,
} from "@/lib/gestor/config-aderencia/types";
import { cn } from "@/lib/utils";

/** Campos de horário, na ordem em que aparecem no formulário. */
const CAMPOS_HORA: { chave: ChaveHoraAderencia; label: string }[] = [
  { chave: "metaLoginManha", label: "Login — turno manhã" },
  { chave: "metaLoginTarde", label: "Login — turno tarde" },
  { chave: "metaP10Primeira", label: "Pausa 10 (1ª)" },
  { chave: "metaP20", label: "Pausa 20" },
  { chave: "metaP10Segunda", label: "Pausa 10 (2ª)" },
];

interface ConfigAderenciaPopoverProps {
  config: ConfigAderencia;
  onSave: (config: ConfigAderencia) => void;
  salvando?: boolean;
  /** Notifica o pai pra elevar a tabela acima do blur enquanto aberto. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Configuração dos horários esperados de login e das pausas. Mesmo padrão de
 * createPortal + overlay z-40 do ConfigMetasPopover do analítico de retenção,
 * pra que o conteúdo abaixo desfoque enquanto o popover está aberto.
 */
export function ConfigAderenciaPopover({
  config,
  onSave,
  salvando = false,
  onOpenChange,
}: ConfigAderenciaPopoverProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<ConfigAderencia>(config);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao reabrir, descarta edição não salva e mostra os últimos valores.
  function handleOpenChange(next: boolean) {
    if (next) setLocal(config);
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSave() {
    onSave(local);
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
            title="Configurações de aderência"
            aria-label="Configurações de aderência"
            className="bg-primary text-primary-foreground hover:opacity-90 flex cursor-pointer items-center justify-center rounded-md p-2 shadow-sm transition-opacity"
          >
            <IconSettings size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="border-border/80 w-84 rounded-2xl border p-5 shadow-2xl backdrop-blur-md"
        >
          <PopoverHeader className="border-border/40 border-b pb-3">
            <div>
              <PopoverTitle className="text-foreground text-sm font-semibold">
                Configurações de Aderência
              </PopoverTitle>
              <p className="text-muted-foreground text-[11px]">
                Horários esperados de login e das pausas, e a janela aceita em
                torno de cada um.
              </p>
            </div>
          </PopoverHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Horários esperados
              </span>

              <div className="space-y-2">
                {CAMPOS_HORA.map(({ chave, label }) => (
                  <div key={chave} className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor={`aderencia-${chave}`}
                      className="text-muted-foreground truncate text-xs font-normal"
                    >
                      {label}
                    </Label>
                    <Input
                      id={`aderencia-${chave}`}
                      type="time"
                      value={local[chave]}
                      onChange={(e) =>
                        setLocal((prev) => ({ ...prev, [chave]: e.target.value }))
                      }
                      className="border-border/80 bg-muted/30 focus:bg-background w-28 shrink-0 rounded-xl text-center text-xs font-semibold transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="aderencia-tolerancia"
                className="ds-mono-sm text-foreground/90 text-xs font-medium"
              >
                Tolerância
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="aderencia-tolerancia"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  step={1}
                  value={local.toleranciaMin}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      toleranciaMin: Number(e.target.value),
                    }))
                  }
                  className="border-border/80 bg-muted/30 focus:bg-background rounded-xl pr-12 text-sm font-semibold transition-all"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-3 text-xs font-bold">
                  min
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Vale para mais e para menos — com {local.toleranciaMin} min, uma
                pausa das 10:00 é aderente entre{" "}
                {somarMinutos("10:00", -local.toleranciaMin)} e{" "}
                {somarMinutos("10:00", local.toleranciaMin)}.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={salvando}
              className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/20 mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold shadow-md transition-all"
            >
              <IconCheck size={14} aria-hidden="true" />
              <span>{salvando ? "Salvando..." : "Salvar Configurações"}</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

/** "HH:MM" + N minutos (N pode ser negativo), só para o texto de exemplo. */
function somarMinutos(hora: string, minutos: number): string {
  const m = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hora;
  const total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + minutos;
  const norm = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
}
