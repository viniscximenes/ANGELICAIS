"use client";

import type { SinalizacaoPrincipal } from "@/lib/monitorias/types";
import { SINALIZACAO_OPTIONS } from "@/lib/monitorias/types";

interface Props {
  value: SinalizacaoPrincipal | null;
  onChange: (value: SinalizacaoPrincipal) => void;
  disabled?: boolean;
}

export function SinalizacaoRadioGroup({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Principal sinalização do atendimento"
      className="space-y-2"
    >
      {SINALIZACAO_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "hover:elevation-2"
            }`}
            style={{
              background: isSelected
                ? "color-mix(in oklch, var(--primary) 8%, transparent)"
                : "transparent",
              border: `1px solid ${
                isSelected
                  ? "color-mix(in oklch, var(--primary) 40%, transparent)"
                  : "var(--border)"
              }`,
            }}
          >
            <input
              type="radio"
              name="sinalizacao"
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              disabled={disabled}
              className="sr-only"
            />
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{
                background: isSelected ? "var(--primary)" : "transparent",
                border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              {isSelected && (
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--primary-foreground)" }}
                />
              )}
            </div>
            <span
              className="ds-body"
              style={{
                color: isSelected
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
              }}
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
