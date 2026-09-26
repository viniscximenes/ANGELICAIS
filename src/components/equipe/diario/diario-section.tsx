"use client";

import {
  type ClipboardEvent as ReactClipboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { SegmentedControl } from "@/app/(dashboard)/kpi/operadores/_components/segmented-control";
import { StyledCard } from "@/components/gestor/styled-card";
import {
  gerarReportsDiario,
  PLACEHOLDER_JUSTIFICATIVA,
  textoTempoLogado,
  type ReportDiario,
} from "@/lib/equipe/diario/gerar-reports-diario";
import type { JustificativaPadrao } from "@/lib/equipe/diario/get-justificativas-padrao";
import { parseDiarioCsv } from "@/lib/equipe/diario/parse-diario-csv";

import { CopyTextoButton } from "./copy-texto-button";
import { DiarioCsvDropzone } from "./diario-csv-dropzone";
import { PresetsJustificativaButton } from "./presets-justificativa-button";

const TODOS_TEMAS = "__todos__";

function celulaDeColuna(
  node: Node | null,
  raiz: HTMLElement,
): HTMLElement | null {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el && el !== raiz) {
    if (el.dataset?.column) return el;
    el = el.parentElement;
  }
  return null;
}

function handleColunaCopy(e: ReactClipboardEvent<HTMLElement>) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const raiz = e.currentTarget;
  const celInicio = celulaDeColuna(range.startContainer, raiz);
  const celFim = celulaDeColuna(range.endContainer, raiz);
  if (!celInicio || !celFim) return;

  const coluna = celInicio.dataset.column;
  if (!coluna || coluna !== celFim.dataset.column) return;

  const celulas = Array.from(
    raiz.querySelectorAll<HTMLElement>(`[data-column="${coluna}"]`),
  ).filter((cel) => range.intersectsNode(cel));

  const texto = celulas
    .map((cel) => (cel.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  if (!texto) return;
  e.clipboardData.setData("text/plain", texto);
  e.preventDefault();
}

interface DiarioSectionProps {
  operadoresValidos: string[];
  rosterErro?: string | null;
  justificativasPadrao: JustificativaPadrao[];
  fontVariableClassName: string;
}

type Resultado = {
  reports: ReportDiario[];
  info: { validas: number; puladas: number; fileName: string };
};

export function DiarioSection({
  operadoresValidos,
  rosterErro,
  justificativasPadrao,
  fontVariableClassName,
}: DiarioSectionProps) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [justificativas, setJustificativas] = useState<Record<string, string>>(
    {},
  );
  const [resetKey, setResetKey] = useState(0);
  const [temaSelecionado, setTemaSelecionado] = useState(TODOS_TEMAS);

  const justRef = useRef(justificativas);
  justRef.current = justificativas;
  const editableRefs = useRef(new Map<string, HTMLSpanElement | null>());

  function aplicarPreset(id: string, texto: string) {
    const el = editableRefs.current.get(id);
    if (el) el.innerText = texto;
    setJustificativas((prev) => ({ ...prev, [id]: texto }));
  }

  const validosSet = useMemo(
    () => new Set(operadoresValidos),
    [operadoresValidos],
  );

  function handleCsv(csvText: string, fileName: string) {
    setErro(null);
    setResetKey((key) => key + 1);

    const parsed = parseDiarioCsv(csvText);
    if (parsed.erro) {
      setResultado(null);
      setJustificativas({});
      setErro(parsed.erro);
      toast.error("Não foi possível processar a base", {
        description: parsed.erro,
        className: "operacao-diario-toast",
      });
      return;
    }

    const reports = gerarReportsDiario(parsed.linhas, validosSet);
    setTemaSelecionado(reports[0]?.tema ?? TODOS_TEMAS);
    setJustificativas({});
    setResultado({
      reports,
      info: {
        validas: parsed.validas,
        puladas: parsed.puladas,
        fileName,
      },
    });
    toast.success("Base processada", {
      description:
        reports.length === 1
          ? "1 report gerado."
          : `${reports.length} reports gerados.`,
      className: "operacao-diario-toast",
    });
  }

  const temas = useMemo(() => {
    const contagens = new Map<string, number>();
    for (const report of resultado?.reports ?? []) {
      contagens.set(report.tema, (contagens.get(report.tema) ?? 0) + 1);
    }
    return Array.from(contagens, ([tema, quantidade]) => ({
      tema,
      quantidade,
    }));
  }, [resultado]);

  const reportsVisiveis = useMemo(() => {
    if (!resultado || temaSelecionado === TODOS_TEMAS) {
      return resultado?.reports ?? [];
    }
    return resultado.reports.filter(
      (report) => report.tema === temaSelecionado,
    );
  }, [resultado, temaSelecionado]);

  const itensTema = useMemo(() => {
    if (!resultado || resultado.reports.length === 0) return [];

    return [
      {
        value: TODOS_TEMAS,
        ariaLabel: `Todos os temas, ${resultado.reports.length} reports`,
        label: (
          <span className="inline-flex items-center gap-2">
            Todos
            <span className="diario-theme-count">
              {resultado.reports.length}
            </span>
          </span>
        ),
      },
      ...temas.map(({ tema, quantidade }) => ({
        value: tema,
        ariaLabel: `${tema}, ${quantidade} reports`,
        label: (
          <span className="inline-flex items-center gap-2">
            {tema}
            <span className="diario-theme-count">{quantidade}</span>
          </span>
        ),
      })),
    ];
  }, [resultado, temas]);

  const operadorMaisLongo = useMemo(() => {
    return (resultado?.reports ?? []).reduce((maisLongo, report) => {
      const operador = `${report.op}@alloha.com`;
      return operador.length > maisLongo.length ? operador : maisLongo;
    }, "Operador");
  }, [resultado]);

  return (
    <section className="space-y-8">
      <div className="min-h-[90px] w-full">
        <StyledCard withGradient className="flex h-full flex-col p-3">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Anexar base
          </span>
          <div className="min-h-0 flex-1">
            <DiarioCsvDropzone
              onCsv={handleCsv}
              fontVariableClassName={fontVariableClassName}
            />
          </div>

          {rosterErro && (
            <p className="mt-3 text-sm text-destructive">
              Não foi possível carregar a equipe: {rosterErro}
            </p>
          )}

          {erro && (
            <p
              role="alert"
              className="status-danger mt-3 rounded-md px-3 py-2 text-sm"
            >
              {erro}
            </p>
          )}
        </StyledCard>
      </div>

      {resultado && (
        <section aria-labelledby="diario-reports-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              id="diario-reports-title"
              className="text-xl font-semibold tracking-[-0.025em] text-foreground"
            >
              Reports gerados
            </h2>
            {itensTema.length > 0 && (
              <SegmentedControl
                items={itensTema}
                value={temaSelecionado}
                onChange={setTemaSelecionado}
                ariaLabel="Filtrar reports por tema"
                layoutId="operacao-diario-tema"
                className="self-start sm:self-auto"
              />
            )}
          </div>

          <StyledCard withGradient className="p-3">
            {resultado.reports.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                Nenhuma divergência a reportar nesta base.
              </p>
            ) : (
              <div
                className="overflow-x-auto scrollbar-tema"
                onCopy={handleColunaCopy}
              >
                <table
                  data-diario-table
                  className="w-full min-w-[900px] table-auto border-collapse"
                >
                  <thead>
                    <tr className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="w-px whitespace-nowrap border-b border-r border-border/50 px-3 py-2.5 text-center">
                        Dia
                      </th>
                      <th className="w-px whitespace-nowrap border-b border-r border-border/50 px-3 py-2.5 text-center">
                        Operador
                        <span
                          aria-hidden="true"
                          className="invisible block h-0 whitespace-nowrap text-sm font-normal normal-case tracking-normal"
                        >
                          {operadorMaisLongo}
                        </span>
                      </th>
                      <th className="w-px whitespace-nowrap border-b border-r border-border/50 px-3 py-2.5 text-center">
                        Tema
                      </th>
                      <th className="w-full min-w-[28rem] border-b border-border/50 px-3 py-2.5 text-center">
                        Report
                      </th>
                      <th
                        aria-label="Ações"
                        className="w-px border-b border-border/50 px-3 py-2.5"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {reportsVisiveis.map((report) => (
                      <tr
                        key={report.id}
                        data-diario-row
                        className="border-b border-border/30 transition-colors last:border-b-0 hover:bg-accent"
                      >
                        <td
                          data-column="dia"
                          className="w-px whitespace-nowrap border-r border-border/30 px-3 py-2 text-center text-sm tabular-nums"
                        >
                          {report.dia}
                        </td>
                        <td
                          data-column="op"
                          className="w-px whitespace-nowrap border-r border-border/30 px-3 py-2 text-center text-sm"
                        >
                          {report.op}@alloha.com
                        </td>
                        <td
                          data-column="tema"
                          className="w-px whitespace-nowrap border-r border-border/30 px-3 py-2 text-center text-sm"
                        >
                          {report.tema}
                        </td>
                        <td
                          data-column="report"
                          className="w-full min-w-[28rem] whitespace-normal px-3 py-2 text-sm leading-relaxed"
                        >
                          {report.tipo === "pausa" ? (
                            report.texto
                          ) : (
                            <>
                              No dia {report.dia} o operador {report.op} registrou{" "}
                              {report.tempoLogado} de tempo logado devido a{" "}
                              <span
                                key={`${report.id}__${resetKey}`}
                                role="textbox"
                                aria-label={`Justificativa de ${report.op} em ${report.dia}`}
                                contentEditable
                                suppressContentEditableWarning
                                data-just-editable
                                data-placeholder={PLACEHOLDER_JUSTIFICATIVA}
                                ref={(element) => {
                                  editableRefs.current.set(report.id, element);
                                  const textoSalvo =
                                    justRef.current[report.id] ?? "";
                                  if (
                                    element &&
                                    textoSalvo &&
                                    element.innerText !== textoSalvo
                                  ) {
                                    element.innerText = textoSalvo;
                                  }
                                }}
                                onInput={(event) => {
                                  const element = event.currentTarget;
                                  const text = element.innerText ?? "";
                                  if (
                                    text.trim() === "" &&
                                    element.innerHTML !== ""
                                  ) {
                                    element.innerHTML = "";
                                  }
                                  setJustificativas((prev) => ({
                                    ...prev,
                                    [report.id]: text,
                                  }));
                                }}
                                className="mx-0.5 border-b border-dashed border-border/70 whitespace-pre-wrap outline-none transition-colors focus:border-ring"
                              />
                            </>
                          )}
                        </td>
                        <td className="w-px whitespace-nowrap px-3 py-2 align-top">
                          <div className="flex items-start justify-end gap-2">
                            {report.tipo === "tempo_logado" && (
                              <PresetsJustificativaButton
                                opcoes={justificativasPadrao}
                                fontVariableClassName={fontVariableClassName}
                                onEscolher={(texto) =>
                                  aplicarPreset(report.id, texto)
                                }
                              />
                            )}
                            <CopyTextoButton
                              fontVariableClassName={fontVariableClassName}
                              getTexto={() =>
                                report.tipo === "pausa"
                                  ? report.texto
                                  : textoTempoLogado(
                                      report,
                                      justRef.current[report.id] ?? "",
                                    )
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </StyledCard>
        </section>
      )}
    </section>
  );
}
