"use client";

import { useId } from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Switch local, EXCLUSIVO de /reports/consolidado — réplica intencional do
 * LabeledSwitch de /kpi/operadores (app/(dashboard)/kpi/operadores/
 * _components/labeled-switch.tsx), mesmo padrão visual (Radix Switch direto,
 * não o components/ui/switch.tsx compartilhado): container h-8, label +
 * switch, mesmas classes/tokens de cor (--switch-off/--switch-on/
 * --switch-knob/--switch-knob-off/--switch-off-border, já definidos em
 * reports-consolidado.css). Duplicado (não importado da rota /kpi/
 * operadores) de propósito — nenhuma das duas rotas deve depender de
 * mudanças futuras na outra.
 *
 * Usado pelo toggle "Exibir RV" (antes "RV Diário") — a função por trás
 * (toggleShowRvDiarioAction / showRvDiario) não muda, só o rótulo e o
 * controle visual (botão pill → switch).
 */
interface LabeledSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function LabeledSwitch({ label, checked, onCheckedChange, disabled }: LabeledSwitchProps) {
  const id = useId();
  return (
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
