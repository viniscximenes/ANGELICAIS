"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconFileDownload,
  IconLoader2,
  IconUser,
  IconUserCheck,
  IconTrash,
} from "@tabler/icons-react";

import { CustomDatePicker } from "@/components/feedback/custom-date-picker";
import { IndisponibilidadeFeedbackForm } from "@/components/feedback/indisponibilidade-form";
import { TempoLogadoFeedbackForm } from "@/components/feedback/tempo-logado-form";
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
  const [activeTab, setActiveTab] = useState<"consolidado" | "tempo-logado" | "indisponibilidade">("consolidado");
  const [segundaFeira, setSegundaFeira] = useState("");
  const [dataFeedback, setDataFeedback] = useState("");
  const [operador, setOperador] = useState("");
  const [dias, setDias] = useState<DiaForm[]>(
    Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })),
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega datas salvas no localStorage ao montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSegunda = localStorage.getItem("feedback_semanal_segunda");
      const savedFeedback = localStorage.getItem("feedback_semanal_data_feedback");
      if (savedSegunda) setSegundaFeira(savedSegunda);
      if (savedFeedback) setDataFeedback(savedFeedback);
    }
  }, []);

  // Salva no localStorage quando segundaFeira muda
  const handleSegundaFeiraChange = (val: string) => {
    setSegundaFeira(val);
    if (typeof window !== "undefined") {
      if (val) {
        localStorage.setItem("feedback_semanal_segunda", val);
      } else {
        localStorage.removeItem("feedback_semanal_segunda");
      }
    }
  };

  // Salva no localStorage quando dataFeedback muda
  const handleDataFeedbackChange = (val: string) => {
    setDataFeedback(val);
    if (typeof window !== "undefined") {
      if (val) {
        localStorage.setItem("feedback_semanal_data_feedback", val);
      } else {
        localStorage.removeItem("feedback_semanal_data_feedback");
      }
    }
  };

  const handleLimpar = () => {
    setOperador("");
    setDias(Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })));
    setErro(null);
  };

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

  // Navegação por setas do teclado
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    field: "retido" | "cancelado"
  ) => {
    const input = e.currentTarget;
    const valueLength = input.value.length;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;

    let targetId = "";

    if (e.key === "ArrowDown") {
      if (idx < 5) {
        e.preventDefault();
        targetId = `input-${idx + 1}-${field}`;
      }
    } else if (e.key === "ArrowUp") {
      if (idx > 0) {
        e.preventDefault();
        targetId = `input-${idx - 1}-${field}`;
      }
    } else if (e.key === "ArrowRight") {
      // Vai para a direita apenas se o cursor estiver no fim do texto ou se nada estiver selecionado
      if (field === "retido" && selectionStart === valueLength && selectionEnd === valueLength) {
        e.preventDefault();
        targetId = `input-${idx}-cancelado`;
      }
    } else if (e.key === "ArrowLeft") {
      // Vai para a esquerda apenas se o cursor estiver no início do texto
      if (field === "cancelado" && selectionStart === 0 && selectionEnd === 0) {
        e.preventDefault();
        targetId = `input-${idx}-retido`;
      }
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
      
      // Obter primeiro nome limpo
      const rawNome = operador.trim().split(/\s+/)[0] || "";
      const primeiroNome = rawNome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z]/g, ""); // Apenas letras, sem acentos
      const formattedNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();

      // Ler e incrementar serial
      let currentSerial = 1;
      if (typeof window !== "undefined") {
        const savedSerial = localStorage.getItem("feedback_consolidado_serial");
        if (savedSerial) {
          const parsed = parseInt(savedSerial, 10);
          if (!isNaN(parsed)) {
            currentSerial = parsed + 1;
          }
        }
        localStorage.setItem("feedback_consolidado_serial", String(currentSerial));
      }

      const serialStr = String(currentSerial).padStart(4, "0");
      const finalFilename = `FeedbackConsolidado_${formattedNome || "Operador"}_${serialStr}.docx`;

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Abas do Feedback Semanal */}
      <div role="tablist" className="elevation-1 inline-flex gap-1 rounded-md p-1 bg-muted/20">
        {[
          { id: "consolidado", label: "Consolidado" },
          { id: "tempo-logado", label: "Tempo Logado" },
          { id: "indisponibilidade", label: "Indisponibilidade" },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            type="button"
            className={[
              "ds-small rounded-md px-4 py-1.5 transition-colors cursor-pointer",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tempo-logado" && (
        <TempoLogadoFeedbackForm supervisorName={supervisorName} />
      )}

      {activeTab === "indisponibilidade" && (
        <IndisponibilidadeFeedbackForm supervisorName={supervisorName} />
      )}

      {activeTab === "consolidado" && (
        <>
          {/* Card 1: Dados do Documento */}
          <div
            className="elevation-1 rounded-xl p-6 space-y-5 bg-card border-zinc-200 dark:border-zinc-800"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="border-b border-border/40 pb-2.5">
              <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
                Consolidado
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
                    className="ds-small w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
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

              {/* Segunda-feira com DatePicker Customizado */}
              <CustomDatePicker
                label="Segunda-feira do Período"
                value={segundaFeira}
                onChange={handleSegundaFeiraChange}
              />

              {/* Data do Feedback com DatePicker Customizado */}
              <CustomDatePicker
                label="Data de Aplicação do Feedback"
                value={dataFeedback}
                onChange={handleDataFeedbackChange}
              />
            </div>
          </div>

          {/* Card 2: Volume Diário de Contatos */}
          <div
            className="elevation-1 rounded-xl p-6 space-y-4 bg-card border-zinc-200 dark:border-zinc-800"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="border-b border-border/40 pb-2.5 flex items-center justify-between">
              <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
                Volume Diário de Contatos
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
                          id={`input-${i}-retido`}
                          type="number"
                          min="0"
                          value={dias[i].retido}
                          onChange={(e) => setDiaField(i, "retido", e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, i, "retido")}
                          placeholder="—"
                          className="ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
                        />
                      </td>
                      <td className="px-3 py-1 text-center border-l border-border/20">
                        <input
                          id={`input-${i}-cancelado`}
                          type="number"
                          min="0"
                          value={dias[i].cancelado}
                          onChange={(e) => setDiaField(i, "cancelado", e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, i, "cancelado")}
                          placeholder="—"
                          className="ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Demonstrativo de Resultados (Preview) */}
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
                  {/* Linha Consolidada with visual highlighting */}
                  <tr className="bg-muted/50 font-bold text-foreground border-t-2 border-border">
                    <td className="ds-small px-4 py-3 font-bold">CONSOLIDADO DA SEMANA</td>
                    <td className="ds-mono-sm px-3 py-3 text-center font-bold text-base">{semana.consolidado.tx}</td>
                    <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.ret}</td>
                    <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.canc}</td>
                    <td className="ds-mono-sm px-3 py-3 text-center font-bold">{semana.consolidado.ped}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Erro e Geração de Arquivo */}
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
        </>
      )}
    </div>
  );
}
