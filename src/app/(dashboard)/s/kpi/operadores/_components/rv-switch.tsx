"use client";

import { LabeledSwitch } from "./labeled-switch";

/**
 * Switch do RV — wrapper fino sobre LabeledSwitch (genérico, também usado
 * pelo switch "Comparar com <dd/mm>" em kpi-equipe-section.tsx), só fixando
 * o rótulo "Exibir RV". Mantido como export próprio pra não precisar tocar
 * no call site em kpi-equipe-section.tsx.
 */
interface RvSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function RvSwitch(props: RvSwitchProps) {
  return <LabeledSwitch label="Exibir RV" {...props} />;
}
