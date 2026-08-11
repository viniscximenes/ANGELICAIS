"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconChevronDown,
  IconFileDownload,
  IconLoader2,
  IconSearch,
  IconTrash,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";

import { CustomDatePicker } from "@/components/feedback/custom-date-picker";
import {
  IndisponibilidadeFeedbackForm,
  type IndisponibilidadeFormHandle,
} from "@/components/feedback/indisponibilidade-form";
import {
  TempoLogadoFeedbackForm,
  type TempoLogadoFormHandle,
} from "@/components/feedback/tempo-logado-form";
import {
  computeSemana,
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

/** Transforma "joao.silva" → "Joao Silva" para exibição */
function formatarNomeEmail(slug: string): string {
  return slug
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

interface OperadorComboboxProps {
  operadores: string[];
  value: string;
  onChange: (val: string) => void;
}

function OperadorCombobox({ operadores, value, onChange }: OperadorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return operadores.filter(
      (op) => op.includes(q) || formatarNomeEmail(op).toLowerCase().includes(q),
    );
  }, [operadores, busca]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Focar no input de busca ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setBusca(""); }}
        className="ds-small flex h-9 w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/50"}>
          {value ? formatarNomeEmail(value) : "Selecione o operador..."}
        </span>
        <IconChevronDown
          size={14}
          className={`text-muted-foreground/60 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
        >
          {/* Campo de busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
            <IconSearch size={13} className="text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar operador..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
            />
            {busca && (
              <button type="button" onClick={() => setBusca("")} className="text-muted-foreground/50 hover:text-foreground">
                <IconX size={13} />
              </button>
            )}
          </div>

          {/* Lista */}
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            {filtrados.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground text-center">
                Nenhum operador encontrado.
              </li>
            ) : (
              filtrados.map((op) => (
                <li
                  key={op}
                  role="option"
                  aria-selected={value === op}
                  onClick={() => { onChange(op); setOpen(false); setBusca(""); }}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    value === op
                      ? "bg-primary/10 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {formatarNomeEmail(op)}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ResultadoSemanalFormProps {
  supervisorName: string;
  operadores: string[];
}

export function ResultadoSemanalForm({ supervisorName, operadores }: ResultadoSemanalFormProps) {
  const [segundaFeira, setSegundaFeira] = useState("");
  const [dataFeedback, setDataFeedback] = useState("");
  const [operador, setOperador] = useState("");
  const [dias, setDias] = useState<DiaForm[]>(
    Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })),
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tempoLogadoRef = useRef<TempoLogadoFormHandle>(null);
  const indisponibilidadeRef = useRef<IndisponibilidadeFormHandle>(null);

  // Carrega datas salvas no localStorage ao montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSegunda = localStorage.getItem("feedback_semanal_segunda");
      const savedFeedback = localStorage.getItem("feedback_semanal_data_feedback");
      if (savedSegunda) setSegundaFeira(savedSegunda);
      if (savedFeedback) setDataFeedback(savedFeedback);
    }
  }, []);

  const handleSegundaFeiraChange = (val: string) => {
    setSegundaFeira(val);
    if (typeof window !== "undefined") {
      val
        ? localStorage.setItem("feedback_semanal_segunda", val)
        : localStorage.removeItem("feedback_semanal_segunda");
    }
  };

  const handleDataFeedbackChange = (val: string) => {
    setDataFeedback(val);
    if (typeof window !== "undefined") {
      val
        ? localStorage.setItem("feedback_semanal_data_feedback", val)
        : localStorage.removeItem("feedback_semanal_data_feedback");
    }
  };

  // Limpa todos os campos (exceto datas persistidas)
  const handleLimparTudo = () => {
    setOperador("");
    setDias(Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })));
    tempoLogadoRef.current?.limpar();
    indisponibilidadeRef.current?.limpar();
    setErro(null);
  };

  const diasInputs: DiaInput[] = useMemo(() => dias.map(parseDia), [dias]);

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

  // Navegação por setas — Seção Consolidado
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    field: "retido" | "cancelado",
  ) => {
    const input = e.currentTarget;
    const valueLength = input.value.length;
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;
    let targetId = "";

    if (e.key === "ArrowDown" && idx < 5) {
      e.preventDefault();
      targetId = `input-${idx + 1}-${field}`;
    } else if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      targetId = `input-${idx - 1}-${field}`;
    } else if (e.key === "ArrowRight" && field === "retido" && selStart === valueLength && selEnd === valueLength) {
      e.preventDefault();
      targetId = `input-${idx}-cancelado`;
    } else if (e.key === "ArrowLeft" && field === "cancelado" && selStart === 0 && selEnd === 0) {
      e.preventDefault();
      targetId = `input-${idx}-retido`;
    }

    if (targetId) {
      (document.getElementById(targetId) as HTMLInputElement | null)?.focus();
    }
  };

  async function handleGerar() {
    setErro(null);

    if (!operador.trim()) { setErro("Selecione o operador."); return; }
    if (!segundaFeira) { setErro("Informe a data da segunda-feira do período."); return; }
    if (!dataFeedback) { setErro("Informe a data do feedback."); return; }

    const temConsolidado = diasInputs.some((d) => d.retido !== null || d.cancelado !== null);
    const temTL = tempoLogadoRef.current?.hasData() ?? false;
    const temIndisp = indisponibilidadeRef.current?.hasData() ?? false;

    if (!temConsolidado && !temTL && !temIndisp) {
      setErro("Preencha pelo menos um dia em alguma das três seções (Consolidado, Tempo Logado ou Indisponibilidade).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback/resultado-semanal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operador: operador.trim(),
          segundaFeira,
          dataFeedback,
          consolidado: diasInputs,
          tempoLogado: tempoLogadoRef.current?.getDias() ?? [],
          indisponibilidade: indisponibilidadeRef.current?.getDias() ?? [],
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "Erro desconhecido");
        setErro(`Erro ao gerar: ${msg}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const rawNome = operador.trim().split(/[\s.]+/)[0] ?? "";
      const primeiroNome = rawNome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z]/g, "");
      const formattedNome =
        primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();

      let currentSerial = 1;
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("feedback_semanal_serial");
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) currentSerial = parsed + 1;
        }
        localStorage.setItem("feedback_semanal_serial", String(currentSerial));
      }

      const serialStr = String(currentSerial).padStart(4, "0");
      const filename = `FeedbackSemanal_${formattedNome || "Operador"}_${serialStr}.docx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
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

  const cardClass =
    "elevation-1 rounded-xl p-6 space-y-4 bg-card border-zinc-200 dark:border-zinc-800";
  const cardStyle = { border: "1px solid var(--border)" };

  const inputClass =
    "ds-mono-sm w-full rounded border border-border bg-transparent px-2 py-1 text-center placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── Card: Dados do Documento ────────────────────────────── */}
      <div className={cardClass} style={cardStyle}>
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Feedback Semanal
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Combobox operador */}
          <div className="space-y-1.5">
            <label className="ds-small text-muted-foreground font-medium block">
              Nome do Operador
            </label>
            <OperadorCombobox
              operadores={operadores}
              value={operador}
              onChange={setOperador}
            />
          </div>

          {/* Supervisor (read-only) */}
          <div className="space-y-1.5">
            <label className="ds-small text-muted-foreground font-medium block">
              Supervisor Responsável
            </label>
            <div className="relative">
              <IconUserCheck
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              />
              <div className="ds-small flex h-9 items-center rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 text-muted-foreground font-medium">
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

      {/* ── Seção 1: Consolidado de Retenção ────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="text-primary font-mono">1</span>
          · Consolidado de Retenção
        </h3>

        {/* Volume Diário */}
        <div className={cardClass} style={cardStyle}>
          <div className="border-b border-border/40 pb-2.5 flex items-center justify-between">
            <h4 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
              Volume Diário de Contatos
            </h4>
            <button
              type="button"
              onClick={() =>
                setDias(Array.from({ length: 6 }, () => ({ retido: "", cancelado: "" })))
              }
              className="ds-small inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-muted/30 hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground rounded transition-colors text-xs font-semibold cursor-pointer"
            >
              <IconTrash size={14} />
              Limpar
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                  <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">
                    Dia da Semana
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-36 border-l border-border/20">
                    Contatos Retidos
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold w-36 border-l border-border/20">
                    Contatos Cancelados
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIAS_LABELS.map((dia, i) => (
                  <tr
                    key={dia}
                    className="hover:bg-muted/5 transition-colors"
                    style={{ borderBottom: i < 5 ? "1px solid var(--border)" : undefined }}
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
                        className={inputClass}
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
                        className={inputClass}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview Consolidado */}
        <div className={cardClass} style={cardStyle}>
          <div className="border-b border-border/40 pb-2.5">
            <h4 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
              Demonstrativo de Resultados (Preview)
            </h4>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/20" style={{ borderColor: "var(--border)" }}>
                  <th className="ds-small text-muted-foreground px-4 py-2 text-left font-semibold">
                    Período
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                    Tx. Retenção
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                    Retidos
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                    Cancelados
                  </th>
                  <th className="ds-small text-muted-foreground px-3 py-2 text-center font-semibold border-l border-border/20">
                    Total Pedidos
                  </th>
                </tr>
              </thead>
              <tbody>
                {semana.dias.map((d, i) => d.temDados ? (
                  <tr
                    key={i}
                    className="hover:bg-muted/5 transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="ds-small px-4 py-2 text-muted-foreground font-medium">
                      {semana.diasFormatados[i]}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-foreground font-semibold">
                      {d.tx}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                      {d.ret}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                      {d.canc}
                    </td>
                    <td className="ds-mono-sm px-3 py-2 text-center text-muted-foreground">
                      {d.ped}
                    </td>
                  </tr>
                ) : null)}
                <tr className="bg-muted/50 font-bold text-foreground border-t-2 border-border">
                  <td className="ds-small px-4 py-3 font-bold">CONSOLIDADO DA SEMANA</td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold text-base">
                    {semana.consolidado.tx}
                  </td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                    {semana.consolidado.ret}
                  </td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                    {semana.consolidado.canc}
                  </td>
                  <td className="ds-mono-sm px-3 py-3 text-center font-bold">
                    {semana.consolidado.ped}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Seção 2: Tempo Logado ────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="text-primary font-mono">2</span>
          · Tempo Logado
        </h3>
        <TempoLogadoFeedbackForm ref={tempoLogadoRef} segundaFeira={segundaFeira} />
      </div>

      {/* ── Seção 3: Indisponibilidade ──────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="text-primary font-mono">3</span>
          · Indisponibilidade
        </h3>
        <IndisponibilidadeFeedbackForm ref={indisponibilidadeRef} segundaFeira={segundaFeira} />
      </div>

      {/* ── Card: Gerar Documento ───────────────────────────────── */}
      <div className={cardClass} style={cardStyle}>
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Gerar Documento Completo
          </h3>
        </div>

        <div className="flex flex-col gap-3">
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

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLimparTudo}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors cursor-pointer"
            >
              <IconTrash size={15} />
              Limpar tudo
            </button>

            <button
              type="button"
              onClick={handleGerar}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold transition-all bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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
