"use client";

import { useMemo, useState } from "react";
import { IconFileDownload, IconLoader2, IconCalendar, IconUser, IconUserCheck, IconCalculator } from "@tabler/icons-react";

import {
  computeSemana,
  formatDataFeedback,
  type DiaInput,
} from "@/lib/feedback/compute-semana";

const DIAS_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

type DiaForm = { retido: string; cancelado: string };

function parseDia(d: DiaForm): DiaInput {
  return {
    retido: d.retido === "" ? null : Number(d.retido),
    cancelado: d.cancelado === "" ? null : Number(d.cancelado),
  };
}

interface ResultadoSemanalFormProps {
  supervisorName: string;
}

export function ResultadoSemanalForm({ supervisorName }: ResultadoSemanalFormProps) {
  const [segundaFeira, setSegundaFeira] = useState("");
  const [dataFeedback, setDataFeedback] = useState("");
  const [operador, setOperador] = useState("");
  const [dias, setDias] = useState<DiaForm[]>(
    Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })),
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const diasInputs: DiaInput[] = useMemo(
    () => dias.map(parseDia),
    [dias],
  );

  const semana = useMemo(
    () => computeSemana(diasInputs, segundaFeira || null),
    [diasInputs, segundaFeira],
  );

  function setDiaField(idx: number, campo: "retido" | "cancelado", val: string) {
    setDias((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [campo]: val };
      return next;
    });
  }

  async function handleGerar() {
    setErro(null);

    if (!operador.trim()) { setErro("Informe o nome do operador."); return; }
    if (!segundaFeira) { setErro("Informe a data da segunda-feira do período."); return; }
    if (!dataFeedback) { setErro("Informe a data do feedback."); return; }
    const temDados = diasInputs.some((d) => d.retido !== null || d.cancelado !== null);
    if (!temDados) { setErro("Preencha pelo menos um dia."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback/resultado-semanal", {
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
      const a = document.createElement("a");
      a.href = url;
      a.download =
        `Feedback_Semanal_${operador.trim().replace(/\s+/g, "_")}_${semana.periodo.replace(/\//g, "-")}.docx`;
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

  const dataFeedbackFormatada = dataFeedback ? formatDataFeedback(dataFeedback) : "";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
      {/* Coluna da Esquerda: Inputs (Formulário) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Card 1: Dados do Documento */}
        <div
          className="elevation-1 rounded-xl p-6 space-y-5 bg-card"
          style={{ border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 border-b border-border/30 pb-3">
            <IconCalendar size={18} className="text-primary" />
            <h2 className="ds-h2 text-base font-semibold">Dados do Documento</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Segunda-feira */}
            <div className="space-y-1.5">
              <label className="ds-small text-muted-foreground font-medium block">
                Segunda-feira do período
              </label>
              <input
                type="date"
                value={segundaFeira}
                onChange={(e) => setSegundaFeira(e.target.value)}
                className="ds-small w-full rounded-md border border-border bg-transparent px-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {semana.periodo && (
                <p className="ds-mono-sm text-muted-foreground text-xs mt-1">
                  Período: <span className="text-foreground font-medium">{semana.periodo}</span>
                </p>
              )}
            </div>

            {/* Data do feedback */}
            <div className="space-y-1.5">
              <label className="ds-small text-muted-foreground font-medium block">
                Data do feedback
              </label>
              <input
                type="date"
                value={dataFeedback}
                onChange={(e) => setDataFeedback(e.target.value)}
                className="ds-small w-full rounded-md border border-border bg-transparent px-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {dataFeedbackFormatada && (
                <p className="ds-mono-sm text-muted-foreground text-xs mt-1">
                  {dataFeedbackFormatada}
                </p>
              )}
            </div>

            {/* Operador */}
            <div className="space-y-1.5">
              <label className="ds-small text-muted-foreground font-medium block">
                Operador
              </label>
              <div className="relative">
                <IconUser size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  placeholder="Nome completo do operador"
                  className="ds-small w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 placeholder:text-muted-foreground/40 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Supervisor */}
            <div className="space-y-1.5">
              <label className="ds-small text-muted-foreground font-medium block">
                Supervisor
              </label>
              <div className="relative">
                <IconUserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                <div className="ds-small flex h-[38px] items-center rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 text-muted-foreground">
                  {supervisorName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Inputs por Dia */}
        <div
          className="elevation-1 rounded-xl p-6 space-y-4 bg-card"
          style={{ border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 border-b border-border/30 pb-3">
            <IconCalculator size={18} className="text-primary" />
            <h2 className="ds-h2 text-base font-semibold">Volume Diário</h2>
          </div>

          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/30" style={{ borderColor: "var(--border)" }}>
                  <th className="ds-small text-muted-foreground px-4 py-2 text-left font-medium">Dia</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-medium w-32 border-l border-border/20">Retido</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-medium w-32 border-l border-border/20">Cancelado</th>
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
                    <td className="ds-small px-4 py-2 text-muted-foreground font-medium">
                      {semana.diasFormatados[i] ?? dia}
                    </td>
                    <td className="px-3 py-1.5 text-center border-l border-border/20">
                      <input
                        type="number"
                        min="0"
                        value={dias[i].retido}
                        onChange={(e) => setDiaField(i, "retido", e.target.value)}
                        placeholder="—"
                        className="ds-mono-sm w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center border-l border-border/20">
                      <input
                        type="number"
                        min="0"
                        value={dias[i].cancelado}
                        onChange={(e) => setDiaField(i, "cancelado", e.target.value)}
                        placeholder="—"
                        className="ds-mono-sm w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Preview (Fixa) */}
      <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-6">
        {/* Card de Resumo do KPI Principal */}
        <div
          className="elevation-1 rounded-xl p-6 bg-card flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {/* Accent decoration line */}
          <div className="absolute top-0 left-0 w-full h-[4px] bg-primary" />
          
          <p className="ds-small text-muted-foreground font-mono tracking-wider uppercase text-[10px]">
            Taxa Consolidada de Retenção
          </p>
          <div className="ds-display font-semibold text-4xl text-foreground">
            {semana.consolidado.tx || "—"}
          </div>
          <div className="flex gap-4 text-xs ds-mono-sm text-muted-foreground">
            <div>
              Retidos: <span className="text-foreground font-semibold">{semana.consolidado.ret || 0}</span>
            </div>
            <div className="opacity-40">|</div>
            <div>
              Cancelados: <span className="text-foreground font-semibold">{semana.consolidado.canc || 0}</span>
            </div>
          </div>
        </div>

        {/* Card do Preview Detalhado */}
        <div
          className="elevation-1 rounded-xl p-6 space-y-4 bg-card"
          style={{ border: "1px solid var(--border)" }}
        >
          <h3 className="ds-h2 text-sm font-semibold border-b border-border/30 pb-2">
            Preview dos Resultados
          </h3>

          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b bg-muted/30" style={{ borderColor: "var(--border)" }}>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-left font-medium">Dia</th>
                  <th className="ds-small text-muted-foreground px-2 py-2 text-center font-medium">Tx</th>
                  <th className="ds-small text-muted-foreground px-2 py-2 text-center font-medium">Ret</th>
                  <th className="ds-small text-muted-foreground px-2 py-2 text-center font-medium">Canc</th>
                </tr>
              </thead>
              <tbody>
                {semana.dias.map((d, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/5 transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="ds-small px-3 py-2 text-muted-foreground font-medium">
                      {semana.diasFormatados[i]?.split(" ")[0]}
                    </td>
                    <td className="ds-mono-sm px-2 py-2 text-center text-foreground font-medium">{d.tx}</td>
                    <td className="ds-mono-sm px-2 py-2 text-center text-muted-foreground">{d.ret}</td>
                    <td className="ds-mono-sm px-2 py-2 text-center text-muted-foreground">{d.canc}</td>
                  </tr>
                ))}
                {/* Linha Consolidado */}
                <tr className="bg-primary/5 font-semibold text-primary">
                  <td className="ds-small px-3 py-2 font-bold">Total</td>
                  <td className="ds-mono-sm px-2 py-2 text-center font-bold">{semana.consolidado.tx}</td>
                  <td className="ds-mono-sm px-2 py-2 text-center">{semana.consolidado.ret}</td>
                  <td className="ds-mono-sm px-2 py-2 text-center">{semana.consolidado.canc}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Erro e Botão de Ação */}
          <div className="space-y-3 pt-2">
            {erro && (
              <p
                className="ds-small rounded-md px-3 py-2 text-xs"
                style={{
                  background: "color-mix(in oklch, var(--danger) 8%, transparent)",
                  color: "var(--danger)",
                  border: "1px solid color-mix(in oklch, var(--danger) 15%, transparent)",
                }}
              >
                {erro}
              </p>
            )}

            <button
              type="button"
              onClick={handleGerar}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {loading ? (
                <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconFileDownload size={16} aria-hidden="true" />
              )}
              {loading ? "Gerando Documento..." : "Gerar Relatório Word"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
