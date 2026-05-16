"use client";

interface Props {
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function EncaminhouPesquisaGroup({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Colaborador encaminhou cliente para pesquisa de satisfação?"
      className="flex items-center gap-3"
    >
      {[
        { val: true, label: "Sim" },
        { val: false, label: "Não" },
      ].map((opt) => {
        const isSelected = value === opt.val;
        return (
          <label
            key={String(opt.val)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition-all ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "hover:scale-[1.02]"
            }`}
            style={{
              background: isSelected
                ? "color-mix(in oklch, var(--primary) 12%, transparent)"
                : "transparent",
              border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
            }}
          >
            <input
              type="radio"
              name="encaminhou_pesquisa"
              checked={isSelected}
              onChange={() => onChange(opt.val)}
              disabled={disabled}
              className="sr-only"
            />
            <div
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
              style={{
                background: isSelected ? "var(--primary)" : "transparent",
                border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              {isSelected && (
                <div
                  className="h-1 w-1 rounded-full"
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
