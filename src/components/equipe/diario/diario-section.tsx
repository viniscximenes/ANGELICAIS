"use client";

import {
  type ClipboardEvent as ReactClipboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { DiarioSkeleton } from "@/app/(dashboard)/s/operacao/diario/loading";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { SegmentedControl } from "@/app/(dashboard)/s/kpi/operadores/_components/segmented-control";
import {
  gerarReportsDiario,
  PLACEHOLDER_JUSTIFICATIVA,
  textoTempoLogado,
  type ReportDiario,
} from "@/lib/equipe/diario/gerar-reports-diario";
import { parseDiarioCsv } from "@/lib/equipe/diario/parse-diario-csv";

import { CopyTextoButton } from "./copy-texto-button";
import { DiarioCsvDropzone } from "./diario-csv-dropzone";
import { DownloadReportButton } from "./download-report-button";

const TODOS_TEMAS = "__todos__";

// Piso mínimo do skeleton ao anexar uma base — mesmo valor do F5
// (MIN_LOADING_MS em page.tsx).
const MIN_LOADING_MS = 3_000;

// Linhas em branco da tabela vazia (antes de anexar uma base ou quando a
// base não gera nenhum report).
const LINHAS_VAZIAS = 12;

// Cabeçalho no mesmo padrão da EquipeTable de /s/reports/consolidado
// (ds-body, negrito, text-foreground, borda inferior em var(--border)).
const TH_CLASS =
  "whitespace-nowrap border-b border-r border-b-border border-r-border/50 px-2 py-2.5 text-center";

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
  fontVariableClassName: string;
}

type Resultado = {
  reports: ReportDiario[];
  info: { validas: number; puladas: number; fileName: string };
};

export function DiarioSection({
  operadoresValidos,
  rosterErro,
  fontVariableClassName,
}: DiarioSectionProps) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [justificativas, setJustificativas] = useState<Record<string, string>>(
    {},
  );
  const [resetKey, setResetKey] = useState(0);
  const [temaSelecionado, setTemaSelecionado] = useState(TODOS_TEMAS);
  const [processando, setProcessando] = useState(false);

  const justRef = useRef(justificativas);
  justRef.current = justificativas;

  const validosSet = useMemo(
    () => new Set(operadoresValidos),
    [operadoresValidos],
  );

  async function handleCsv(csvText: string, fileName: string) {
    const inicio = Date.now();
    setProcessando(true);

    const parsed = parseDiarioCsv(csvText);
    const reports = parsed.erro
      ? []
      : gerarReportsDiario(parsed.linhas, validosSet);

    const faltam = MIN_LOADING_MS - (Date.now() - inicio);
    if (faltam > 0) {
      await new Promise((resolve) => setTimeout(resolve, faltam));
    }
    setProcessando(false);

    setErro(null);
    setResetKey((key) => key + 1);

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

    // Toda base nova abre fixa no filtro "Pausas"; se a base não tiver
    // nenhuma pausa, cai no primeiro tema existente (ou "Todos").
    setTemaSelecionado(
      reports.some((report) => report.tema === "Pausas")
        ? "Pausas"
        : (reports[0]?.tema ?? TODOS_TEMAS),
    );
    setJustificativas({});
    setResultado({
      reports,
      info: {
        validas: parsed.validas,
        puladas: parsed.puladas,
        fileName,
      },
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
      {/*
        Skeleton ao anexar uma base — o MESMO do F5 (loading.tsx), fixo por
        cima só da área de conteúdo (abaixo do header de 60px, à direita da
        sidebar de 240px em lg+), mesmo padrão do overlay de refresh de
        /s/reports/consolidado.
      */}
      {processando && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] !mt-0 overflow-hidden lg:left-[240px]">
          <DiarioSkeleton comFiltro />
        </div>
      )}

      <div className="w-full">
        <div className="grid min-h-[180px] min-w-0">
          <DiarioCsvDropzone onCsv={handleCsv} />
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
      </div>

      <section aria-label="Reports gerados" className="space-y-4">
        {itensTema.length > 0 && (
          <div className="flex justify-start sm:justify-end">
            <SegmentedControl
              items={itensTema}
              value={temaSelecionado}
              onChange={setTemaSelecionado}
              ariaLabel="Filtrar reports por tema"
              layoutId="operacao-diario-tema"
            />
          </div>
        )}

        <KpiFrame>
          <div
            className="overflow-x-auto scrollbar-tema"
            onCopy={handleColunaCopy}
          >
            <table
              data-diario-table
              className="w-full min-w-[900px] table-auto border-collapse"
            >
              <thead>
                <tr className="ds-body bg-muted/40 font-bold uppercase tracking-wide text-foreground">
                  <th className={`w-px ${TH_CLASS}`}>Dia</th>
                  <th className={`w-px ${TH_CLASS}`}>
                    Operador
                    <span
                      aria-hidden="true"
                      className="invisible block h-0 whitespace-nowrap text-sm font-normal normal-case tracking-normal"
                    >
                      {operadorMaisLongo}
                    </span>
                  </th>
                  <th className={`w-px ${TH_CLASS}`}>Tema</th>
                  <th className="w-full min-w-[28rem] border-b border-border px-2 py-2.5 text-center">
                    Report
                  </th>
                  <th
                    aria-label="Ações"
                    className="w-px border-b border-border px-2 py-2.5"
                  />
                </tr>
              </thead>
              <tbody>
                {reportsVisiveis.length === 0 &&
                  Array.from({ length: LINHAS_VAZIAS }, (_, i) => (
                    <tr
                      key={`vazia-${i}`}
                      aria-hidden="true"
                      className="h-12 border-b border-border/30 last:border-b-0"
                    >
                      <td className="w-px border-r border-border/30 px-3 py-2 text-sm">
                        &nbsp;
                      </td>
                      <td className="w-px border-r border-border/30 px-3 py-2 text-sm" />
                      <td className="w-px border-r border-border/30 px-3 py-2 text-sm" />
                      <td className="w-full px-3 py-2 text-sm" />
                      <td className="w-px px-3 py-2" />
                    </tr>
                  ))}
                {reportsVisiveis.map((report) => (
                  <tr
                    key={report.id}
                    data-diario-row
                    className="border-b border-border/30 last:border-b-0"
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
                          {report.tempoLogado} de tempo logado.{" "}
                          <span
                            key={`${report.id}__${resetKey}`}
                            role="textbox"
                            aria-label={`Justificativa de ${report.op} em ${report.dia}`}
                            contentEditable
                            suppressContentEditableWarning
                            data-just-editable
                            data-placeholder={PLACEHOLDER_JUSTIFICATIVA}
                            ref={(element) => {
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
                        <DownloadReportButton
                          dia={report.dia}
                          operador={`${report.op}@alloha.com`}
                          tema={report.tema}
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
        </KpiFrame>
      </section>
    </section>
  );
}
