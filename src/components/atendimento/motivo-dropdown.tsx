"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { MOTIVOS } from "@/lib/atendimento/types";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function MotivoDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectedLabel =
    MOTIVOS.find((m) => m.value === value)?.label ?? "Selecionar...";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/30 flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left transition-colors"
        style={{
          border: "1px solid var(--border)",
          background: "var(--background)",
        }}
      >
        <span
          className="ds-mono text-[13px]"
          style={{
            color: value ? "var(--foreground)" : "var(--muted-foreground)",
          }}
        >
          {selectedLabel}
        </span>
        <IconChevronDown
          size={13}
          className={`text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="elevation-3 absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded"
          style={{
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        >
          {MOTIVOS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                onChange(m.value);
                setOpen(false);
              }}
              className="ds-mono hover:bg-muted/40 w-full px-2.5 py-1.5 text-left text-[13px] transition-colors"
              style={{
                color:
                  value === m.value
                    ? "var(--primary)"
                    : "var(--foreground)",
                fontWeight: value === m.value ? 500 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
