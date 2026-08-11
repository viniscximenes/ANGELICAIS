"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { IconTrash } from "@tabler/icons-react";

import {
  computeIndisponibilidade,
  type DiaInputIndisp,
} from "@/lib/feedback/compute-indisponibilidade";

const DIAS_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const FIELDS = ["nr17", "part", "outras"] as const;

type DiaFormIndisp = { nr17: string; part: string; outras: string };

function parseDiaIndisp(d: DiaFormIndisp): DiaInputIndisp {
  return {
    indisp: null,
    nr17: d.nr17.trim() === "" ? null : d.nr17.trim(),
    part: d.part.trim() === "" ? null : d.part.trim(),
    outras: d.outras.trim() === "" ? null : d.outras.trim(),
  };
}

// Permite apenas dígitos e vírgula decimal PT-BR.
function filtrarNumerico(val: string): string {
  return val.replace(/[^0-9,]/g, "");
}

export type IndisponibilidadeFormHandle = {
  getDias(): DiaInputIndisp[];
  hasData(): boolean;
  limpar(): void;
};

interface IndisponibilidadeFeedbackFormProps {
  segundaFeira: string;
}

export const IndisponibilidadeFeedbackForm = forwardRef<
  IndisponibilidadeFormHandle,
  IndisponibilidadeFeedbackFormProps
>(function IndisponibilidadeFeedbackForm({ segundaFeira }, ref) {
  const [dias, setDias] = useState<DiaFormIndisp[]>(
    Array.from({ length: 6 }, () => ({ nr17: "", part: "", outras: "" })),
  );

  const diasInputs: DiaInputIndisp[] = useMemo(() => dias.map(parseDiaIndisp), [dias]);

  const semana = useMemo(
    () => computeIndisponibilidade(diasInputs, segundaFeira || null),
    [diasInputs, segundaFeira],
  );

  useImperativeHandle(
    ref,
    () => ({
      getDias: () => diasInputs,
      hasData: () => diasInputs.some((d) => d.nr17 !== null || d.part !== null || d.outras !== null),
      limpar: () => setDias(Array.from({ length: 6 }, () => ({ nr17: "", part: "", outras: "" }))),
    }),
    [diasInputs],
  );

  const handleLimpar = () => {
    setDias(Array.from({ length: 6 }, () => ({ nr17: "", part: "", outras: "" })));
  };

  function setDiaField(idx: number, campo: "nr17" | "part" | "outras", val: string) {
    setDias((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [campo]: filtrarNumerico(val) };
      return next;
    });
  }

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    field: "nr17" | "part" | "outras",
  ) => {
    const input = e.currentTarget;
    const valueLength = input.value.length;
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;
    const fieldIdx = FIELDS.indexOf(field);

    let targetId = "";

    if (e.key === "ArrowDown" && idx < 5) {
      e.preventDefault();
      targetId = `indisp-input-${idx + 1}-${field}`;
    } else if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      targetId = `indisp-input-${idx - 1}-${field}`;
    } else if (
      e.key === "ArrowRight" &&
      selStart === valueLength &&
      selEnd === valueLength &&
      fieldIdx < FIELDS.length - 1
    ) {
      e.preventDefault();
      targetId = `indisp-input-${idx}-${FIELDS[fieldIdx + 1]}`;
    } else if (
      e.key === "ArrowLeft" &&
      selStart === 0 &&
      selEnd === 0 &&
      fieldIdx > 0
    ) {
      e.preventDefault();
      targetId = `indisp-input-${idx}-${FIELDS[fieldIdx - 1]}`;
    }

    if (targetId) {
      const el = document.getElementById(targetId) as HTMLInputElement | null;
      if (el) el.focus();
    }
  };

  const inputClass =
    "ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500";

  return (
    <div className="space-y-6">
      {/* Card: Dados Diários */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-4 bg-card border-zinc-200 dark:border-zinc-800"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5 flex items-center justify-between">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Dados Diários
          </h3>
          <button
            type="button"
            onClick={handleLimpar}
            className="ds-small inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-muted/30 hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground rounded transition-colors text-xs font-semibold cursor-pointer"
          >
            <IconTrash size={14} />
            Limpar campos
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">
                  Dia da Semana
                </th>
                <th className="ds-small text-muted-foreground px-2 py-2 text-center font-semibold w-20 border-l border-border/20">
                  NR17
                </th>
                <th className="ds-small text-muted-foreground px-2 py-2 text-center font-semibold w-24 border-l border-border/20">
                  Particular
                </th>
                <th className="ds-small text-muted-foreground px-2 py-2 text-center font-semibold w-20 border-l border-border/20">
                  Outras
                </th>
              </tr>
            </thead>
            <tbody>
              {DIAS_LABELS.map((dia, i) => (
                <tr
                  key={dia}
                  className="hover:bg-muted/5 transition-colors"
                  style={{
                    borderBottom: i < 5 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <td className="ds-small px-4 py-2 text-muted-foreground font-semibold">
                    {semana.diasFormatados[i] ?? dia}
                  </td>
                  <td className="px-2 py-1 text-center border-l border-border/20">
                    <input
                      id={`indisp-input-${i}-nr17`}
                      type="text"
                      inputMode="decimal"
                      value={dias[i].nr17}
                      onChange={(e) => setDiaField(i, "nr17", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, i, "nr17")}
                      placeholder="—"
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-1 text-center border-l border-border/20">
                    <input
                      id={`indisp-input-${i}-part`}
                      type="text"
                      inputMode="decimal"
                      value={dias[i].part}
                      onChange={(e) => setDiaField(i, "part", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, i, "part")}
                      placeholder="—"
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-1 text-center border-l border-border/20">
                    <input
                      id={`indisp-input-${i}-outras`}
                      type="text"
                      inputMode="decimal"
                      value={dias[i].outras}
                      onChange={(e) => setDiaField(i, "outras", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, i, "outras")}
                      placeholder="—"
                      className={inputClass}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card: Preview */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-4 bg-card border-zinc-200 dark:border-zinc-800"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Demonstrativo de Resultados (Preview)
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">
                  Período
                </th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                  Indisp. Total
                </th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                  NR17
                </th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                  Particular
                </th>
                <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                  Outras
                </th>
              </tr>
            </thead>
            <tbody>
              {semana.dias.map((d, i) => (d.indisp !== "—" || d.nr17 !== "—" || d.part !== "—" || d.outras !== "—") ? (
                <tr
                  key={i}
                  className="hover:bg-muted/5 transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="ds-small px-4 py-2 text-muted-foreground font-medium">
                    {semana.diasFormatados[i]}
                  </td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-foreground font-semibold">
                    {d.indisp}
                  </td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                    {d.nr17}
                  </td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                    {d.part}
                  </td>
                  <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                    {d.outras}
                  </td>
                </tr>
              ) : null)}
              <tr className="bg-muted/50 font-bold text-foreground border-t-2 border-border">
                <td className="ds-small px-4 py-3 font-bold">CONSOLIDADO DA SEMANA</td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold text-base">
                  {semana.consolidado.indisp}
                </td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                  {semana.consolidado.nr17}
                </td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                  {semana.consolidado.part}
                </td>
                <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                  {semana.consolidado.outras}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
