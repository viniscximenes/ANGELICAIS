"use client";

import { type ClipboardEvent as ReactClipboardEvent, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

import { StyledCard } from "@/components/gestor/styled-card";
import {
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
} from "@/components/gestor/tabela-padrao";
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

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const GRID_COLS = "1fr 1.5fr 1fr 6fr";

/** Sobe do nó até a célula ancestral com [data-column], parando na raiz. */
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

/**
 * Handler do evento `copy` no container da tabela de reports.
 *
 * Se a seleção de texto do navegador estiver confinada a UMA única coluna
 * (DIA/OP/TEMA/REPORT), reescreve o clipboard com só os valores daquela
 * coluna, um por linha, na ordem das linhas. Seleção que cruza colunas cai
 * no comportamento padrão do navegador.
 */
function handleColunaCopy(e: ReactClipboardEvent<HTMLElement>) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const raiz = e.currentTarget;

  // Os dois extremos da seleção precisam cair na mesma coluna.
  const celInicio = celulaDeColuna(range.startContainer, raiz);
  const celFim = celulaDeColuna(range.endContainer, raiz);
  if (!celInicio || !celFim) return;

  const coluna = celInicio.dataset.column;
  if (!coluna || coluna !== celFim.dataset.column) return;

  // Todas as células dessa coluna tocadas pela seleção, em ordem de DOM
  // (= ordem visual das linhas).
  const celulas = Array.from(
    raiz.querySelectorAll<HTMLElement>(`[data-column="${coluna}"]`),
  ).filter((cel) => range.intersectsNode(cel));

  if (celulas.length === 0) return;

  const texto = celulas
    .map((cel) => (cel.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 0)
    .join("\n");

  if (!texto) return;

  e.clipboardData.setData("text/plain", texto);
  e.preventDefault();
}

interface DiarioSectionProps {
  /** Identificadores nome.sobrenome do roster de /configuracoes/equipe. */
  operadoresValidos: string[];
  rosterErro?: string | null;
  /** Textos prontos do campo de justificativa (equipe_diario_justificativas_padrao). */
  justificativasPadrao: JustificativaPadrao[];
}

type Resultado = {
  reports: ReportDiario[];
  info: { validas: number; puladas: number; fileName: string };
};

export function DiarioSection({
  operadoresValidos,
  rosterErro,
  justificativasPadrao,
}: DiarioSectionProps) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [justificativas, setJustificativas] = useState<Record<string, string>>(
    {},
  );
  // Muda a cada upload — força o remount dos campos contentEditable, evitando
  // que texto antigo persista no DOM quando um id de report se repete.
  const [resetKey, setResetKey] = useState(0);

  // Lido no clique de copiar — evita fechar sobre um valor obsoleto.
  const justRef = useRef(justificativas);
  justRef.current = justificativas;

  // Nós DOM dos campos contentEditable, por id de report — usados para
  // injetar o texto de um preset (o campo é uncontrolled).
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

    setResetKey((k) => k + 1);

    const parsed = parseDiarioCsv(csvText);
    if (parsed.erro) {
      // Novo CSV substitui o resultado anterior por completo, mesmo em erro.
      setResultado(null);
      setJustificativas({});
      setErro(parsed.erro);
      return;
    }

    const reports = gerarReportsDiario(parsed.linhas, validosSet);
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="mt-6 space-y-4"
    >
      <StyledCard withGradient className="flex flex-col gap-3 p-3">
        <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
          Base do dia
        </span>

        <DiarioCsvDropzone onCsv={handleCsv} />

        {rosterErro && (
          <p className="ds-small text-destructive">
            Não foi possível carregar a equipe: {rosterErro}
          </p>
        )}

        {erro && (
          <p
            role="alert"
            className="status-danger ds-small rounded-md px-2 py-1"
          >
            {erro}
          </p>
        )}

        {resultado && (
          <p className="ds-mono-sm text-muted-foreground text-[11px]">
            {resultado.info.fileName} · {resultado.info.validas} linhas válidas
            {resultado.info.puladas > 0 &&
              ` · ${resultado.info.puladas} ignoradas`}{" "}
            · {resultado.reports.length} divergência(s) a reportar
          </p>
        )}
      </StyledCard>

      {resultado && (
        <StyledCard withGradient className="p-3">
          <div className="mb-2">
            <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
              Reports
            </span>
          </div>

          {resultado.reports.length === 0 ? (
            <p className="ds-body text-muted-foreground px-3 py-8 text-center">
              Nenhuma divergência a reportar nesta base.
            </p>
          ) : (
            <div className={TABELA_CONTAINER_CLASS} onCopy={handleColunaCopy}>
              <style>{`
                [data-just-editable]:empty::before {
                  content: attr(data-placeholder);
                  color: var(--muted-foreground);
                  pointer-events: none;
                }
              `}</style>
              <div
                className={TABELA_HEADER_CLASS}
                style={{ ...TABELA_HEADER_BORDA, gridTemplateColumns: GRID_COLS }}
              >
                <div className={TABELA_HEADER_CELL_CLASS}>Dia</div>
                <div className={TABELA_HEADER_CELL_CLASS}>Op</div>
                <div className={TABELA_HEADER_CELL_CLASS}>Tema</div>
                <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>Report</div>
              </div>

              {resultado.reports.map((r) => {
                return (
                  <div
                    key={r.id}
                    className={`${TABELA_LINHA_CLASS} border-border/30 border-t ${
                      r.tipo === "tempo_logado" ? "min-h-[64px]" : ""
                    }`}
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div
                      data-column="dia"
                      className="ds-mono-sm border-border/30 border-r px-3 py-2 text-center"
                    >
                      {r.dia}
                    </div>
                    <div
                      data-column="op"
                      className="ds-mono-sm border-border/30 border-r px-3 py-2 text-center"
                    >
                      {/* Domínio fixo só na exibição — o REPORT segue usando r.op puro. */}
                      {r.op}@alloha.com
                    </div>
                    <div
                      data-column="tema"
                      className="ds-mono-sm border-border/30 border-r px-3 py-2 text-center"
                    >
                      {r.tema}
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2">
                      <div
                        data-column="report"
                        className="ds-small min-w-0 flex-1 leading-relaxed"
                      >
                        {r.tipo === "pausa" ? (
                          r.texto
                        ) : (
                          <>
                            No dia {r.dia} o operador {r.op} registrou{" "}
                            {r.tempoLogado} de tempo logado devido a{" "}
                            <span
                              key={`${r.id}__${resetKey}`}
                              role="textbox"
                              aria-label={`Justificativa de ${r.op} em ${r.dia}`}
                              contentEditable
                              suppressContentEditableWarning
                              data-just-editable
                              data-placeholder={PLACEHOLDER_JUSTIFICATIVA}
                              ref={(el) => {
                                editableRefs.current.set(r.id, el);
                              }}
                              onInput={(e) => {
                                const el = e.currentTarget;
                                const txt = el.innerText ?? "";
                                // Limpa <br>/<div> residual pra o placeholder
                                // (:empty) voltar quando o campo é esvaziado.
                                if (txt.trim() === "" && el.innerHTML !== "") {
                                  el.innerHTML = "";
                                }
                                setJustificativas((prev) => ({
                                  ...prev,
                                  [r.id]: txt,
                                }));
                              }}
                              className="border-border/70 focus:border-primary/80 mx-0.5 border-b border-dashed whitespace-pre-wrap outline-none"
                            />
                          </>
                        )}
                      </div>
                      {r.tipo === "tempo_logado" && (
                        <PresetsJustificativaButton
                          opcoes={justificativasPadrao}
                          onEscolher={(texto) => aplicarPreset(r.id, texto)}
                        />
                      )}
                      <CopyTextoButton
                        getTexto={() =>
                          r.tipo === "pausa"
                            ? r.texto
                            : textoTempoLogado(r, justRef.current[r.id] ?? "")
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </StyledCard>
      )}
    </motion.section>
  );
}
