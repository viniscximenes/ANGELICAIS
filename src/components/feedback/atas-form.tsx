"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  IconFileDownload,
  IconLoader2,
  IconUserCheck,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { MODELOS_ATA } from "@/lib/atas/modelos";
import { formatDataFeedback } from "@/lib/feedback/compute-semana";

interface AtasFormProps {
  supervisorName: string;
}

function CustomDatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + "T12:00:00");
    return new Date();
  });

  const formattedDisplay = useMemo(() => {
    if (!value) return "Selecione uma data...";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }, [value]);

  const daysGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }, [viewDate]);

  const selectDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="relative space-y-1.5 w-full">
      <label className="ds-small text-muted-foreground font-medium block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="ds-small flex h-9 w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-2 text-left text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/50"}>
          {formattedDisplay}
        </span>
        <IconCalendar size={15} className="text-muted-foreground/60" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 mt-1 z-50 w-64 rounded-lg p-3 shadow-xl"
            style={{
              border: "1px solid var(--border)",
              background: "color-mix(in oklch, var(--card) 95%, black)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <IconChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-foreground">
                {meses[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-muted-foreground/60">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((day, idx) => {
                if (day === null) return <div key={idx} />;
                const isSelected =
                  value ===
                  `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-7 w-7 rounded text-xs transition-colors flex items-center justify-center font-medium cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AtasForm({ supervisorName }: AtasFormProps) {
  const [modeloIdx, setModeloIdx] = useState<number | "personalizado">(0);
  const [tema, setTema] = useState(MODELOS_ATA[0].tema);
  const [descricao, setDescricao] = useState(MODELOS_ATA[0].descricao);
  const [dataAplicacao, setDataAplicacao] = useState("");
  const [quantidade, setQuantidade] = useState(15);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [descricao]);

  function handleModeloChange(val: string) {
    if (val === "personalizado") {
      setModeloIdx("personalizado");
      setTema("");
      setDescricao("");
    } else {
      const idx = Number(val);
      setModeloIdx(idx);
      setTema(MODELOS_ATA[idx].tema);
      setDescricao(MODELOS_ATA[idx].descricao);
    }
  }

  const dataFormatada = dataAplicacao ? formatDataFeedback(dataAplicacao) : "";
  const metade = Math.ceil(Math.max(1, quantidade) / 2);

  async function handleGerar() {
    setErro(null);
    if (!tema.trim()) { setErro("Informe o tema da ata."); return; }
    if (!descricao.trim()) { setErro("A descrição não pode estar vazia."); return; }
    if (!dataAplicacao) { setErro("Informe a data de aplicação."); return; }
    if (quantidade < 1) { setErro("A quantidade de operadores deve ser pelo menos 1."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback/atas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: tema.trim(),
          descricao: descricao.trim(),
          data_aplicacao: dataAplicacao,
          quantidade,
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
      a.download = `Ata_${tema.trim().replace(/\s+/g, "_")}_${dataAplicacao.replace(/-/g, "")}.docx`;
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
      {/* Card 1: Configuração da Ata */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-5 bg-card"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Configuração da Ata
          </h3>
        </div>

        <div className="space-y-4">
          {/* Dropdown modelo */}
          <div className="space-y-1.5">
            <label className="ds-small text-muted-foreground font-medium block">
              Modelo de Tema
            </label>
            <select
              value={modeloIdx === "personalizado" ? "personalizado" : String(modeloIdx)}
              onChange={(e) => handleModeloChange(e.target.value)}
              className="ds-small h-9 w-full rounded-md border border-border bg-transparent px-3 py-2 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
            >
              {MODELOS_ATA.map((m, i) => (
                <option key={i} value={String(i)}>
                  {m.tema}
                </option>
              ))}
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {/* Tema — read-only se modelo, editável se personalizado */}
          <div className="space-y-1.5">
            <label className="ds-small text-muted-foreground font-medium block">
              Tema
            </label>
            {modeloIdx === "personalizado" ? (
              <input
                type="text"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Digite o tema do comunicado"
                className="ds-small h-9 w-full rounded-md border border-border bg-transparent px-3 py-2 text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
              />
            ) : (
              <div className="ds-small flex h-9 items-center rounded-md border border-border/50 bg-muted/20 px-3 font-semibold text-foreground">
                {tema}
              </div>
            )}
          </div>

          {/* Descrição — sempre editável */}
          <div className="space-y-1.5">
            <label className="ds-small text-muted-foreground font-medium block">
              Descrição do Comunicado
            </label>
            <textarea
              ref={textareaRef}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Texto do comunicado..."
              className="ds-small w-full rounded-md border border-border bg-transparent px-3 py-2 text-foreground leading-relaxed transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 resize-none overflow-hidden"
              style={{ minHeight: "150px" }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Data da aplicação */}
            <CustomDatePicker
              label="Data de Aplicação"
              value={dataAplicacao}
              onChange={setDataAplicacao}
            />

            {/* Quantidade de operadores */}
            <div className="space-y-1.5">
              <label className="ds-small text-muted-foreground font-medium block">
                Qtd. de Operadores
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
                className="ds-small h-9 w-full rounded-md border border-border bg-transparent px-3 py-2 text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
              />
            </div>

            {/* Supervisor */}
            <div className="space-y-1.5">
              <label className="ds-small text-muted-foreground font-medium block">
                Supervisor Responsável
              </label>
              <div className="relative">
                <IconUserCheck
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                />
                <div className="ds-small flex h-9 items-center rounded-md border border-border/50 bg-muted/20 pl-9 pr-3 text-muted-foreground font-medium truncate">
                  {supervisorName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Preview */}
      <div
        className="elevation-1 rounded-xl p-6 space-y-4 bg-card"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-border/40 pb-2.5">
          <h3 className="ds-h2 text-sm font-bold uppercase tracking-wider text-foreground">
            Preview do Documento
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Tema:{" "}
              <span className="font-semibold text-foreground">
                {tema.trim() || <em className="text-muted-foreground/50">não definido</em>}
              </span>
            </span>
            <span className="text-muted-foreground">
              Data:{" "}
              <span className="font-semibold text-foreground">
                {dataFormatada || <em className="text-muted-foreground/50">não definida</em>}
              </span>
            </span>
            <span className="text-muted-foreground">
              Assinaturas:{" "}
              <span className="font-semibold text-foreground">
                {quantidade} operador{quantidade !== 1 ? "es" : ""} · {metade} linhas por coluna
              </span>
            </span>
          </div>

          {descricao.trim() && (
            <div
              className="rounded-md px-4 py-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap"
              style={{
                background: "color-mix(in oklch, var(--muted) 30%, transparent)",
                border: "1px solid var(--border)",
              }}
            >
              {descricao.trim()}
            </div>
          )}
        </div>

        {/* Aviso impressão */}
        <div
          className="flex items-start gap-3 rounded-md px-4 py-3 text-sm"
          style={{
            background: "color-mix(in oklch, var(--warning) 8%, transparent)",
            border: "1px solid color-mix(in oklch, var(--warning) 20%, transparent)",
            color: "var(--warning)",
          }}
        >
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Imprima este documento em frente e verso — a página 1 traz o comunicado e o verso as
            assinaturas, ocupando uma única folha.
          </span>
        </div>

        {/* Erro e botão */}
        <div className="flex flex-col gap-3 pt-1">
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
              {loading ? "Gerando..." : "Gerar Ata (.docx)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
