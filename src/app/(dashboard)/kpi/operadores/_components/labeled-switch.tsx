"use client";

import { useId } from "react";
import { Switch as SwitchPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Switch local genérico — Radix Switch usado diretamente (não
 * components/ui/switch.tsx), por pedido explícito: essa rota não deve
 * depender de mudanças futuras no switch compartilhado, e vice-versa.
 * Extraído de rv-switch.tsx pra ser reaproveitado também pelo switch de
 * "Comparar com <dd/mm>" — mesmo container, cores, fonte, altura e
 * acessibilidade; só o rótulo muda por instância.
 */
export interface LabeledSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Texto do tooltip — só é montado (Provider próprio) quando informado. */
  disabledTooltip?: string;
}

function LabeledSwitchControl({
  label,
  checked,
  onCheckedChange,
  disabled,
}: Omit<LabeledSwitchProps, "disabledTooltip">) {
  const id = useId();
  return (
    // <label htmlFor> explícito (em vez de só envolver o <button role="switch">)
    // — mais robusto entre navegadores/leitores de tela do que confiar só no
    // forwarding implícito de clique de um <label> que envolve um <button>.
    <label
      htmlFor={id}
      className={cn(
        "font-sans inline-flex h-8 items-center gap-2 text-sm font-medium text-muted-foreground select-none",
        disabled ? "cursor-not-allowed opacity-[0.45]" : "cursor-pointer",
      )}
    >
      <span>{label}</span>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
          "border-[var(--switch-off-border)] bg-[var(--switch-off)] data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--switch-on)]",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block size-3.5 rounded-full bg-[var(--switch-knob-off)] shadow-sm transition-transform motion-reduce:transition-none",
            "translate-x-0.5 data-[state=checked]:translate-x-[15px] data-[state=checked]:bg-[var(--switch-knob)]",
          )}
        />
      </SwitchPrimitive.Root>
    </label>
  );
}

export function LabeledSwitch({ label, checked, onCheckedChange, disabled, disabledTooltip }: LabeledSwitchProps) {
  if (disabled && disabledTooltip) {
    return (
      <TooltipPrimitive.Provider delayDuration={200}>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger asChild>
            <div>
              <LabeledSwitchControl
                label={label}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
              />
            </div>
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            {/*
              Radix Portal monta em document.body por padrão — fora da div
              com data-page="kpi-operadores". O seletor de kpi-operadores.css
              é por ATRIBUTO, não por ancestralidade — repetir o atributo
              aqui reestabelece o escopo (tokens + --font-sans) neste nó.
            */}
            <TooltipPrimitive.Content
              data-page="kpi-operadores"
              sideOffset={6}
              className="font-sans z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md"
            >
              {disabledTooltip}
              <TooltipPrimitive.Arrow className="fill-foreground" />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  }

  return (
    <LabeledSwitchControl label={label} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  );
}
