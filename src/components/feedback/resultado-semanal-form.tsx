"use client";

import { useMemo, useState } from "react";
import { IconFileDownload, IconLoader2, IconCalendar, IconUser, IconUserCheck, IconTable } from "@tabler/icons-react";

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
    if (!temDados) { setErro("Preencha pelo menos um dia para o relatório."); return; }

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Container Principal: Estilo Folha de Relatório Centrada */}
      <div
        className="elevation-1 rounded-xl p-8 space-y-8 bg-card"
        style={{ border: "1px solid var(--border)" }}
      >
        {/* Seção 1: Cabeçalho do Relatório */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <IconCalendar size={18} className="text-primary" />
            <h3 className="ds-h2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              I. Identificação do Relatório
            </h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="ds-small text-muted-foreground font-medium block">
                Nome do Operador
              </label>
              <div className="relative">
                <IconUser size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  placeholder="Informe o nome completo"
                  className="ds-small w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="ds-small text-muted-foreground font-medium block">
                Supervisor Responsável
              </label>
              <div className="relative">
                <IconUserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                <div className="ds-small flex h-[38px] items-center rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 text-muted-foreground font-medium">
                  {supervisorName}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="ds-small text-muted-foreground font-medium block">
                Segunda-feira do Período
              </label>
              <input
                type="date"
                value={segundaFeira}
                onChange={(e) => setSegundaFeira(e.target.value)}
                className="ds-small w-full rounded-md border border-border bg-transparent px-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {semana.periodo && (
                <p className="ds-mono-sm text-muted-foreground text-[10px] mt-0.5">
                  Período correspondente: <span className="text-foreground font-semibold">{semana.periodo}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="ds-small text-muted-foreground font-medium block">
                Data de Aplicação do Feedback
              </label>
              <input
                type="date"
                value={dataFeedback}
                onChange={(e) => setDataFeedback(e.target.value)}
                className="ds-small w-full rounded-md border border-border bg-transparent px-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {dataFeedbackFormatada && (
                <p className="ds-mono-sm text-muted-foreground text-[10px] mt-0.5">
                  Formatado: <span className="text-foreground font-semibold">{dataFeedbackFormatada}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Seção 2: Volume de Contatos da Semana */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <IconTable size={18} className="text-primary" />
            <h3 className="ds-h2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              II. Volume Diário de Contatos
            </h3>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                  <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">Dia da Semana</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-36 border-l border-border/20">Contatos Retidos</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-36 border-l border-border/20">Contatos Cancelados</th>
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
                        type="number"
                        min="0"
                        value={dias[i].retido}
                        onChange={(e) => setDiaField(i, "retido", e.target.value)}
                        placeholder="—"
                        className="ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </td>
                    <td className="px-3 py-1 text-center border-l border-border/20">
                      <input
                        type="number"
                        min="0"
                        value={dias[i].cancelado}
                        onChange={(e) => setDiaField(i, "cancelado", e.target.value)}
                        placeholder="—"
                        className="ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção 3: Tabela Demonstrativa de Resultados (Preview) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <IconFileDownload size={18} className="text-primary" />
            <h3 className="ds-h2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              III. Demonstrativo de Resultados (Preview)
            </h3>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                  <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">Período</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Tx. Retenção</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Retidos</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Cancelados</th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">Total Pedidos</th>
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
                    <td className="ds-mono-sm px-3 py-2 text-center text-foreground font-semibold">{d.tx}</td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">{d.ret}</td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">{d.canc}</td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">{d.ped}</td>
                  </tr>
                ))}
                {/* Linha Consolidada com destaque visual */}
                <tr className="bg-primary/5 font-semibold text-primary border-t-2 border-primary/20">
                  <td className="ds-small px-4 py-3 font-bold">CONSOLIDADO DA SEMANA</td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold text-lg">{semana.consolidado.tx}</td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.ret}</td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.canc}</td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.ped}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção 4: Erro e Geração de Arquivo */}
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
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
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
              {loading ? "Exportando..." : "Exportar Relatório Word (.docx)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
