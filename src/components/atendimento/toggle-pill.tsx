"use client";

import { IconCheck } from "@tabler/icons-react";

interface Props {
  checked: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  /** Tom visual: "neutral" (padrão), "success" (retenções), "danger" (cancelado) */
  tone?: "neutral" | "success" | "danger";
}

export function TogglePill({
  checked,
  onClick,
  label,
  disabled,
  tone = "neutral",
}: Props) {
  const toneVar =
    tone === "success"
      ? "--success"
      : tone === "danger"
        ? "--danger"
        : "--primary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-30"
      style={{
        border: `1px solid ${checked ? `var(${toneVar})` : "var(--border)"}`,
        background: checked
          ? `color-mix(in oklch, var(${toneVar}) 12%, transparent)`
          : "var(--background)",
        boxShadow: checked
          ? `inset 0 0 0 1px color-mix(in oklch, var(${toneVar}) 40%, transparent)`
          : "none",
      }}
    >
      <div
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm transition-all"
        style={{
          border: `1.5px solid ${checked ? `var(${toneVar})` : "var(--muted-foreground)"}`,
          background: checked ? `var(${toneVar})` : "transparent",
        }}
        aria-hidden="true"
      >
        {checked && (
          <IconCheck
            size={10}
            style={{ color: "var(--background)" }}
            strokeWidth={3.5}
          />
        )}
      </div>
      <span
        className="ds-mono flex-1 text-[13px] leading-tight"
        style={{
          color: checked ? `var(${toneVar})` : "var(--foreground)",
          fontWeight: checked ? 500 : 400,
        }}
      >
        {label}
      </span>
    </button>
  );
}
