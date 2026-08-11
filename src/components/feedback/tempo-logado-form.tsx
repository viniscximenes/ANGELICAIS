"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { IconTrash } from "@tabler/icons-react";

import {
  computeTempoLogado,
  type DiaInputTL,
} from "@/lib/feedback/compute-tempo-logado";

const DIAS_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const FIELDS = ["tlog", "login", "deslog"] as const;

type DiaFormTL = { tlog: string; login: string; deslog: string };

function parseDiaTL(d: DiaFormTL): DiaInputTL {
  return {
    tlog: d.tlog.trim() === "" ? null : d.tlog.trim(),
    login: d.login.trim() === "" ? null : d.login.trim(),
    deslog: d.deslog.trim() === "" ? null : d.deslog.trim(),
  };
}

function aplicarMascaraHora(valor: string, tipo: "HH:MM:SS" | "HH:MM"): string {
  const digitos = valor.replace(/\D/g, "");
  if (tipo === "HH:MM") {
    const limited = digitos.slice(0, 4);
    if (limited.length <= 2) return limited;
    return `${limited.slice(0, 2)}:${limited.slice(2)}`;
  } else {
    const limited = digitos.slice(0, 6);
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.slice(0, 2)}:${limited.slice(2)}`;
    return `${limited.slice(0, 2)}:${limited.slice(2, 4)}:${limited.slice(4)}`;
  }
}

export type TempoLogadoFormHandle = {
  getDias(): DiaInputTL[];
  hasData(): boolean;
  limpar(): void;
};

interface TempoLogadoFeedbackFormProps {
  segundaFeira: string;
}

export const TempoLogadoFeedbackForm = forwardRef<TempoLogadoFormHandle, TempoLogadoFeedbackFormProps>(
  function TempoLogadoFeedbackForm({ segundaFeira }, ref) {
    const [dias, setDias] = useState<DiaFormTL[]>(
      Array.from({ length: 6 }, () => ({ tlog: "", login: "", deslog: "" })),
    );

    const diasInputs: DiaInputTL[] = useMemo(() => dias.map(parseDiaTL), [dias]);

    const semana = useMemo(
      () => computeTempoLogado(diasInputs, segundaFeira || null),
      [diasInputs, segundaFeira],
    );

    useImperativeHandle(
      ref,
      () => ({
        getDias: () => diasInputs,
        hasData: () => diasInputs.some((d) => d.tlog !== null || d.login !== null || d.deslog !== null),
        limpar: () => setDias(Array.from({ length: 6 }, () => ({ tlog: "", login: "", deslog: "" }))),
      }),
      [diasInputs],
    );

    const handleLimpar = () => {
      setDias(Array.from({ length: 6 }, () => ({ tlog: "", login: "", deslog: "" })));
    };

    function setDiaField(idx: number, campo: "tlog" | "login" | "deslog", val: string) {
      setDias((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [campo]: val };
        return next;
      });
    }

    const handleInputKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      idx: number,
      field: "tlog" | "login" | "deslog",
    ) => {
      const input = e.currentTarget;
      const valueLength = input.value.length;
      const selStart = input.selectionStart ?? 0;
      const selEnd = input.selectionEnd ?? 0;
      const fieldIdx = FIELDS.indexOf(field);

      let targetId = "";

      if (e.key === "ArrowDown" && idx < 5) {
        e.preventDefault();
        targetId = `tl-input-${idx + 1}-${field}`;
      } else if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        targetId = `tl-input-${idx - 1}-${field}`;
      } else if (
        e.key === "ArrowRight" &&
        selStart === valueLength &&
        selEnd === valueLength &&
        fieldIdx < FIELDS.length - 1
      ) {
        e.preventDefault();
        targetId = `tl-input-${idx}-${FIELDS[fieldIdx + 1]}`;
      } else if (
        e.key === "ArrowLeft" &&
        selStart === 0 &&
        selEnd === 0 &&
        fieldIdx > 0
      ) {
        e.preventDefault();
        targetId = `tl-input-${idx}-${FIELDS[fieldIdx - 1]}`;
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
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-32 border-l border-border/20">
                    T. Logado
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-28 border-l border-border/20">
                    H. Login
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-28 border-l border-border/20">
                    H. Deslog
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
                    <td className="px-3 py-1 text-center border-l border-border/20">
                      <input
                        id={`tl-input-${i}-tlog`}
                        type="text"
                        value={dias[i].tlog}
                        onChange={(e) => setDiaField(i, "tlog", aplicarMascaraHora(e.target.value, "HH:MM:SS"))}
                        onKeyDown={(e) => handleInputKeyDown(e, i, "tlog")}
                        placeholder="06:20:00"
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1 text-center border-l border-border/20">
                      <input
                        id={`tl-input-${i}-login`}
                        type="text"
                        value={dias[i].login}
                        onChange={(e) => setDiaField(i, "login", aplicarMascaraHora(e.target.value, "HH:MM"))}
                        onKeyDown={(e) => handleInputKeyDown(e, i, "login")}
                        placeholder="14:03"
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-1 text-center border-l border-border/20">
                      <input
                        id={`tl-input-${i}-deslog`}
                        type="text"
                        value={dias[i].deslog}
                        onChange={(e) => setDiaField(i, "deslog", aplicarMascaraHora(e.target.value, "HH:MM"))}
                        onKeyDown={(e) => handleInputKeyDown(e, i, "deslog")}
                        placeholder="20:18"
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
                    T. Logado
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                    H. Login
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                    H. Deslog
                  </th>
                </tr>
              </thead>
              <tbody>
                {semana.dias.map((d, i) => (d.tlog !== "—" || d.login !== "—" || d.deslog !== "—") ? (
                  <tr
                    key={i}
                    className="hover:bg-muted/5 transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="ds-small px-4 py-2 text-muted-foreground font-medium">
                      {semana.diasFormatados[i]}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-foreground font-semibold">
                      {d.tlog}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                      {d.login}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                      {d.deslog}
                    </td>
                  </tr>
                ) : null)}
                <tr className="bg-muted/50 font-bold text-foreground border-t-2 border-border">
                  <td className="ds-small px-4 py-3 font-bold">CONSOLIDADO DA SEMANA</td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold text-base">
                    {semana.consolidado.tlog}
                  </td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                    {semana.consolidado.login}
                  </td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                    {semana.consolidado.deslog}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  },
);
