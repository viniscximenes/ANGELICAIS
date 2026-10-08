"use client";

import { useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { getDataPngHoje } from "@/components/dashboard/export-popup-png-theme";
import type { AderenciaOperador } from "@/lib/d1-db/calcular-aderencia";

import {
  PAUSA_FIELDS,
  fmtPct,
  formatDiferenca,
  formatLogin,
  formatLogout,
} from "./format-operador-analitico";
import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import { TOAST_CLASS } from "./constantes";

interface Props {
  operador: OperadorAnaliticoTempoIndisp | null;
  nomeExibido: string;
  aderencia: AderenciaOperador;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperadorAnaliticoDialog({
  operador,
  nomeExibido,
  aderencia,
  open,
  onOpenChange,
}: Props) {
  const pngRef = useRef<HTMLDivElement>(null);

  if (!operador) return null;

  // Nome real (email antes do @) — sempre este no PNG, nunca nome fantasia.
  const nomeReal = operador.email.split("@")[0] || operador.email;
  const { file: dataFile } = getDataPngHoje();

  // Cor semântica nos valores com meta — igual à TX RETENÇÃO do modal do
  // Consolidado (verde dentro, vermelho fora). MESMOS critérios da tabela
  // principal (tempo-indisp-tabela.tsx: belowMetaTL / acimaMetaIndisp): Tempo
  // Logado avaliado pra quem já logou, inclusive "ainda logado" (escala
  // fixa); ausente fica neutro.
  const corTempoLogado =
    operador.statusTL === "ausente" ? "text-foreground" : operador.cumpriuMetaTL ? "text-success" : "text-danger";
  const corIndisp =
    operador.indisponibilidade === null
      ? "text-foreground"
      : operador.cumpriuMetaIndisp
        ? "text-success"
        : "text-danger";

  const resumo = [
    { label: "Tempo Logado", valor: operador.tempoLogado || "—", cor: corTempoLogado },
    { label: "Indisponibilidade", valor: fmtPct(operador.indisponibilidade), cor: corIndisp },
    { label: "Hora Login", valor: formatLogin(operador.horaLogin), cor: "text-foreground" },
    { label: "Hora Logout", valor: formatLogout(operador.statusTL, operador.horaLogout), cor: "text-foreground" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        data-page: o DialogContent vive em portal (document.body) — o atributo
        leva o tema e a fonte da página (FonteInter) até ele.
        data-operador-neumorfico: mesmo visual neumórfico do dialog do
        operador do Consolidado (globals.css), com data-neu-tile nos KPIs.
        pagina-padrao: barras de rolagem do padrão também neste portal.
      */}
      <DialogContent
        data-page="reports-tempo-indisponibilidade"
        data-operador-neumorfico
        // sm:max-w-4xl: mesma largura do modal do operador do Consolidado.
        className="pagina-padrao max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-4xl bg-background border-border/80 p-6 shadow-2xl"
      >
        <ExportPopupPngButton
          contentRef={pngRef}
          filename={`${nomeReal}_${dataFile}.png`}
          className="absolute top-2 right-10"
          corDeFundoDoAlvo
          toastClassName={TOAST_CLASS}
          showSuccessToast={false}
        />

        {/* Descrição para leitor de tela (o Radix avisa "Missing Description"
            sem ela) — mesmo padrão do OperadorDetalheDialog do Consolidado.
            sr-only e FORA do pngRef: não aparece na tela nem no PNG. */}
        <DialogDescription className="sr-only">
          Detalhe do operador: tempo logado, indisponibilidade, aderência aos horários programados e pausas do dia.
        </DialogDescription>

        {/*
          Sem template separado pra exportação: o PNG captura este mesmo
          wrapper (via pngRef + ExportPopupPngButton), com background
          explícito porque o fundo do DialogContent fica no ancestral, fora
          do que é capturado. A imagem sai igual ao modal na tela, no tema
          ATUAL da sessão (claro ou escuro). Mesmo padrão de
          OperadorDetalheDialog (/s/reports/consolidado).
        */}
        <div
          ref={pngRef}
          style={{ backgroundColor: "var(--background)" }}
        >
          <DialogHeader className="pb-3 space-y-1.5">
            <DialogTitle className="ds-h3 text-foreground font-semibold tracking-tight text-xl">
              {nomeExibido}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* ── Resumo ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {resumo.map((c) => (
                // Mesmo padrão do OperadorDetalheDialog do Consolidado:
                // sem borda/fundo, apenas o espaçamento interno do texto.
                <div
                  key={c.label}
                  data-neu-tile
                  className="flex flex-col justify-center gap-1 px-4 py-3.5"
                >
                  <p className="ds-small text-muted-foreground mb-1 font-bold tracking-wider uppercase">
                    {c.label}
                  </p>
                  <p className={`ds-display text-2xl font-bold tabular-nums ${c.cor}`}>
                    {c.valor}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Aderência (real x programado) ─────────────────────── */}
            <div className="space-y-2">
              {/* Título + linha até a borda — mesmo padrão do modal do
                  operador do Consolidado ("Evolução por hora"). */}
              <div className="flex items-center gap-3">
                <h3 className="ds-h3 shrink-0 font-semibold text-foreground">Aderência</h3>
                <div aria-hidden="true" className="bg-border h-px flex-1" />
              </div>
              <div className="overflow-hidden">
                {aderencia.forecast === null ? (
                  <p className="ds-small text-muted-foreground p-6 text-center">
                    Horários programados não cadastrados para este operador.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    {/* .cabecalho-tabela: cabeçalho no visual da "Retenção
                        por Tema" do modal do Consolidado (globals.css). */}
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="cabecalho-tabela">
                          <th className="px-4 py-2.5 font-semibold">Item</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Forecast</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Real</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Diferença</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aderencia.items.map((item) => (
                          <tr
                            key={item.label}
                            className="border-border/20 border-b last:border-0"
                          >
                            <td className="text-foreground ds-body px-4 py-2.5 text-xs font-medium">
                              {item.label}
                            </td>
                            <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                              {item.horaForecast ?? "—"}
                            </td>
                            <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                              {item.horaReal ?? "—"}
                            </td>
                            <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                              {formatDiferenca(item.diferencaMin)}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs font-semibold">
                              {item.dentroTolerancia === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : item.dentroTolerancia ? (
                                <span style={{ color: "var(--success)" }} className="font-medium">
                                  OK
                                </span>
                              ) : (
                                <span style={{ color: "var(--danger)" }} className="font-medium">
                                  FORA
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── Pausas detalhadas (d1_indisponibilidade) ──────────── */}
            {(() => {
              const pausasComDados = PAUSA_FIELDS.filter((f) => {
                const val = operador.pausas[f.key];
                return val && val !== "00:00:00" && val !== "—";
              });

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="ds-h3 shrink-0 font-semibold text-foreground">Pausas detalhadas</h3>
                    <div aria-hidden="true" className="bg-border h-px flex-1" />
                  </div>
                  <div className="overflow-hidden">
                    {pausasComDados.length === 0 ? (
                      <p className="ds-small text-muted-foreground p-6 text-center">
                        Nenhuma pausa registrada para este operador.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="cabecalho-tabela">
                              <th className="px-4 py-2.5 font-semibold">Pausa</th>
                              <th className="px-4 py-2.5 text-center font-semibold">Duração</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pausasComDados.map((f) => {
                              const val = operador.pausas[f.key];
                              return (
                                <tr
                                  key={f.key}
                                  className="border-border/20 border-b last:border-0"
                                >
                                  <td className="text-foreground ds-body px-4 py-2.5 text-xs font-medium">
                                    {f.label}
                                  </td>
                                  <td className="text-muted-foreground ds-mono-sm px-4 py-2.5 text-center text-xs tabular-nums">
                                    {val}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
