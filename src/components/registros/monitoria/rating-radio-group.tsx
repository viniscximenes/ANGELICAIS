"use client";

import type { NotaAvaliacao } from "@/lib/monitorias/types";
import { NOTA_OPTIONS } from "@/lib/monitorias/types";

interface Props {
  label: string;
  value: NotaAvaliacao | null;
  onChange: (value: NotaAvaliacao) => void;
  disabled?: boolean;
  name: string;
}

export function RatingRadioGroup({
  label,
  value,
  onChange,
  disabled,
  name,
}: Props) {
  return (
    <div className="space-y-2">
      <p className="ds-body font-medium">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap items-center gap-2"
      >
        {NOTA_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col items-center gap-1.5 transition-all ${
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:scale-[1.03]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
                className="sr-only"
              />
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
                style={{
                  background: isSelected ? "var(--primary)" : "transparent",
                  border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                  boxShadow: isSelected
                    ? "0 2px 8px color-mix(in oklch, var(--primary) 35%, transparent)"
                    : "none",
                }}
              >
                {isSelected && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--primary-foreground)" }}
                  />
                )}
              </div>
              <span
                className="ds-mono-sm transition-colors"
                style={{
                  color: isSelected
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                  fontSize: "10px",
                  textAlign: "center",
                  maxWidth: "60px",
                }}
              >
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
