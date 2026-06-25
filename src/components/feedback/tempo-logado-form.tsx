"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconFileDownload,
  IconLoader2,
  IconTrash,
  IconUser,
  IconUserCheck,
} from "@tabler/icons-react";

import {
  computeTempoLogado,
  type DiaInputTL,
} from "@/lib/feedback/compute-tempo-logado";
import { CustomDatePicker } from "@/components/feedback/custom-date-picker";

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

interface TempoLogadoFeedbackFormProps {
  supervisorName: string;
}

export function TempoLogadoFeedbackForm({ supervisorName }: TempoLogadoFeedbackFormProps) {
  const [segundaFeira, setSegundaFeira] = useState("");
  const [dataFeedback, setDataFeedback] = useState("");
  const [operador, setOperador] = useState("");
  const [dias, setDias] = useState<DiaFormTL[]>(
    Array.from({ length: 6 }, () => ({ tlog: "", login: "", deslog: "" })),
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSegunda = localStorage.getItem("tempologado_segunda");
      const savedFeedback = localStorage.getItem("tempologado_data_feedback");
      if (savedSegunda) setSegundaFeira(savedSegunda);
      if (savedFeedback) setDataFeedback(savedFeedback);
    }
  }, []);

  const handleSegundaFeiraChange = (val: string) => {
    setSegundaFeira(val);
    if (typeof window !== "undefined") {
      if (val) {
        localStorage.setItem("tempologado_segunda", val);
      } else {
        localStorage.removeItem("tempologado_segunda");
      }
    }
  };

  const handleDataFeedbackChange = (val: string) => {
    setDataFeedback(val);
    if (typeof window !== "undefined") {
      if (val) {
        localStorage.setItem("tempologado_data_feedback", val);
      } else {
        localStorage.removeItem("tempologado_data_feedback");
      }
    }
  };

  const handleLimpar = () => {
    setOperador("");
    setDias(Array.from({ length: 6 }, () => ({ tlog: "", login: "", deslog: "" })));
    setErro(null);
  };

  const diasInputs: DiaInputTL[] = useMemo(() => dias.map(parseDiaTL), [dias]);

  const semana = useMemo(
    () => computeTempoLogado(diasInputs, segundaFeira || null),
    [diasInputs, segundaFeira],
  );

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

  async function handleGerar() {
    setErro(null);

    if (!operador.trim()) { setErro("Informe o nome do operador."); return; }
    if (!segundaFeira) { setErro("Informe a data da segunda-feira do período."); return; }
    if (!dataFeedback) { setErro("Informe a data do feedback."); return; }
    const temDados = diasInputs.some(
      (d) => d.tlog !== null || d.login !== null || d.deslog !== null,
    );
    if (!temDados) { setErro("Preencha pelo menos um dia para o relatório."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback/tempo-logado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operador: operador.trim(),
          segundaFeira,
          dataFeedback,
          dias: diasInputs,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "Erro desconhecido");
        setErro(`Erro ao gerar: ${msg}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const rawNome = operador.trim().split(/\s+/)[0] || "";
      const primeiroNome = rawNome
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z]/g, "");
      const formattedNome =
        primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();

      let currentSerial = 1;
      if (typeof window !== "undefined") {
        const savedSerial = localStorage.getItem("tempologado_serial");
        if (savedSerial) {
          const parsed = parseInt(savedSerial, 10);
          if (!isNaN(parsed)) currentSerial = parsed + 1;
        }
        localStorage.setItem("tempologado_serial", String(currentSerial));
      }

      const serialStr = String(currentSerial).padStart(4, "0");
      const finalFilename = `FeedbackTempoLogado_${formattedNome || "Operador"}_${serialStr}.docx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro("Erro de rede. Tente novamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500";

  return (
    <div className="space-y-6">
      {/* Card 1: Dados do Documento */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-5 bg-card border-zinc-200 dark:border-zinc-800"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Tempo Logado
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="ds-small text-muted-foreground font-medium block">
              Nome do Operador
            </label>
            <div className="relative">
              <IconUser
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
              />
              <input
                type="text"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                placeholder="Informe o nome completo"
                className="ds-small w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="ds-small text-muted-foreground font-medium block">
              Supervisor Responsável
            </label>
            <div className="relative">
              <IconUserCheck
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              />
              <div className="ds-small flex h-[38px] items-center rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 text-muted-foreground font-medium">
                {supervisorName}
              </div>
            </div>
          </div>

          <CustomDatePicker
            label="Segunda-feira do Período"
            value={segundaFeira}
            onChange={handleSegundaFeiraChange}
          />

          <CustomDatePicker
            label="Data de Aplicação do Feedback"
            value={dataFeedback}
            onChange={handleDataFeedbackChange}
          />
        </div>
      </div>

      {/* Card 2: Dados Diários */}
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

      {/* Card 3: Preview */}
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
              {semana.dias.map((d, i) => (
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
              ))}
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

        <div className="flex flex-col gap-3 pt-2">
          {erro && (
            <p
              className="ds-small rounded-md px-4 py-2 text-xs"
              style={{
                background: "color-mix(in oklch, var(--danger) 8%, transparent)",
                color: "var(--danger)",
                border: "1px solid color-mix(in oklch, var(--danger) 15%, transparent)",
              }}
            >
              {erro}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGerar}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-all bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconFileDownload size={16} aria-hidden="true" />
              )}
              {loading ? "Exportando..." : "Exportar Relatório Word (.docx)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
