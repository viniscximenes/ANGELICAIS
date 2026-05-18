"use client";

import { useEffect, useState } from "react";

interface Props {
  valueSeconds: number | null;
  onChange: (seconds: number | null) => void;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Input de tempo em 3 campos separados: HH : MM : SS
 */
export function DiarioTimeInput({
  valueSeconds,
  onChange,
  disabled,
  required,
}: Props) {
  const initialH = valueSeconds !== null ? Math.floor(valueSeconds / 3600) : 0;
  const initialM =
    valueSeconds !== null ? Math.floor((valueSeconds % 3600) / 60) : 0;
  const initialS = valueSeconds !== null ? valueSeconds % 60 : 0;

  const [h, setH] = useState(String(initialH).padStart(2, "0"));
  const [m, setM] = useState(String(initialM).padStart(2, "0"));
  const [s, setS] = useState(String(initialS).padStart(2, "0"));

  useEffect(() => {
    if (valueSeconds === null) {
      setH("00");
      setM("00");
      setS("00");
    } else {
      setH(String(Math.floor(valueSeconds / 3600)).padStart(2, "0"));
      setM(String(Math.floor((valueSeconds % 3600) / 60)).padStart(2, "0"));
      setS(String(valueSeconds % 60).padStart(2, "0"));
    }
  }, [valueSeconds]);

  function update(newH: string, newM: string, newS: string) {
    const hN = parseInt(newH, 10) || 0;
    const mN = parseInt(newM, 10) || 0;
    const sN = parseInt(newS, 10) || 0;

    const total = hN * 3600 + mN * 60 + sN;

    if (total === 0 && !required) {
      onChange(null);
    } else {
      onChange(total);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={h}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setH(v);
          update(v, m, s);
        }}
        onBlur={() => setH((prev) => prev.padStart(2, "0"))}
        disabled={disabled}
        placeholder="00"
        className="elevation-2 ds-mono w-14 rounded-md px-2 py-2 text-center"
        style={{ border: "1px solid var(--border)" }}
        aria-label="Horas"
      />
      <span className="ds-mono text-muted-foreground">:</span>
      <input
        type="text"
        inputMode="numeric"
        value={m}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          const clamped = Math.min(parseInt(v || "0", 10), 59);
          const finalV = isNaN(clamped) ? v : String(clamped);
          setM(finalV);
          update(h, finalV, s);
        }}
        onBlur={() => setM((prev) => prev.padStart(2, "0"))}
        disabled={disabled}
        placeholder="00"
        className="elevation-2 ds-mono w-14 rounded-md px-2 py-2 text-center"
        style={{ border: "1px solid var(--border)" }}
        aria-label="Minutos"
      />
      <span className="ds-mono text-muted-foreground">:</span>
      <input
        type="text"
        inputMode="numeric"
        value={s}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          const clamped = Math.min(parseInt(v || "0", 10), 59);
          const finalV = isNaN(clamped) ? v : String(clamped);
          setS(finalV);
          update(h, m, finalV);
        }}
        onBlur={() => setS((prev) => prev.padStart(2, "0"))}
        disabled={disabled}
        placeholder="00"
        className="elevation-2 ds-mono w-14 rounded-md px-2 py-2 text-center"
        style={{ border: "1px solid var(--border)" }}
        aria-label="Segundos"
      />
    </div>
  );
}
