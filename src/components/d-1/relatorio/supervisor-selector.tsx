"use client";

interface SupervisorSelectorProps {
  supervisores: string[];
  value: string;
  onChange: (supervisor: string) => void;
}

/**
 * Converte "ANA ANGELICA MATTOS GONCALVES" → "Ana Angelica Mattos Goncalves"
 * apenas para exibição. O value do option continua sendo o nome ORIGINAL,
 * que é o que casa com os dados do consolidado.
 */
function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function SupervisorSelector({
  supervisores,
  value,
  onChange,
}: SupervisorSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="supervisor-select"
        className="ds-mono-sm text-muted-foreground uppercase tracking-wider"
      >
        Equipe / Supervisor
      </label>
      <select
        id="supervisor-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="elevation-2 ds-body rounded-md px-3 py-2"
        style={{
          border: "1px solid var(--border)",
          colorScheme: "dark",
          minWidth: "320px",
          maxWidth: "100%",
        }}
      >
        {supervisores.map((sup) => (
          <option key={sup} value={sup}>
            {toTitleCase(sup)}
          </option>
        ))}
      </select>
    </div>
  );
}
