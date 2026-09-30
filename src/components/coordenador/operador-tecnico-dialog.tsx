"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TABELA_LINHA_CLASS, TABELA_NOME_CELL_CLASS, TABELA_VALOR_CELL_CLASS } from "@/components/gestor/tabela-padrao";
import {
  TIPOS_RETENCAO,
  type AtendimentoTecnico,
  type OperadorLinha,
  type TipoRetencao,
} from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";

import { abaixoDaMeta, classeTx, formatMarca, formatTx } from "./format";
import { Cabecalho, CelulaTx } from "./tabela-supervisores";

/* ───────── Agregações ───────── */

type Agregado = { chave: string; retidos: number; cancelados: number };

function agrupar(lista: AtendimentoTecnico[], chave: (a: AtendimentoTecnico) => string): Agregado[] {
  const mapa = new Map<string, Agregado>();
  for (const a of lista) {
    const k = chave(a);
    const agg = mapa.get(k) ?? { chave: k, retidos: 0, cancelados: 0 };
    if (a.classe === "cancelado") agg.cancelados += 1;
    else agg.retidos += 1;
    mapa.set(k, agg);
  }
  return [...mapa.values()].sort(
    (a, b) => b.cancelados - a.cancelados || b.retidos + b.cancelados - (a.retidos + a.cancelados),
  );
}

function txDe(a: { retidos: number; cancelados: number }) {
  const total = a.retidos + a.cancelados;
  return total > 0 ? a.retidos / total : null;
}

function rotuloHora(label: string): string {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  return `${label.slice(0, 2)}h`;
}

/* ───────── Peças visuais ───────── */

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      {/* "Título ————": linha divisória na mesma altura do título, até a borda. */}
      <div>
        <div className="flex items-center gap-3">
          <h4 className="ds-h3 text-foreground shrink-0 font-semibold">{titulo}</h4>
          <div aria-hidden="true" className="bg-border h-px flex-1" />
        </div>
        {subtitulo && <p className="ds-small text-muted-foreground mt-0.5">{subtitulo}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, valor, classe }: { label: string; valor: ReactNode; classe?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 px-4 py-2.5 shadow-[var(--shadow-sm)]">
      <p className="ds-small text-muted-foreground tracking-wider uppercase">{label}</p>
      <p
        className={cn("mt-1 text-2xl font-normal tracking-tight", classe ?? "text-foreground")}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {valor}
      </p>
    </div>
  );
}

/** Tabela padrão (cabeçalho do Consolidado): Nome | Tx | Pedidos | Retidos | Cancelados. */
function TabelaAgregado({ primeira, linhas, meta }: { primeira: string; linhas: Agregado[]; meta: number }) {
  const grid: CSSProperties = { gridTemplateColumns: "2.4fr 1.2fr 1fr 1fr 1fr" };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <Cabecalho grid={grid} colunas={[primeira, "Tx Retenção", "Pedidos", "Retidos", "Cancelados"]} />
        {linhas.map((l) => (
          <div key={l.chave} className={cn(TABELA_LINHA_CLASS, "border-t border-border/40")} style={grid}>
            <div className={cn(TABELA_NOME_CELL_CLASS, "text-foreground")}>{l.chave}</div>
            <CelulaTx tx={txDe(l)} meta={meta} className="border-r border-border/30" />
            <div className={TABELA_VALOR_CELL_CLASS}>{l.retidos + l.cancelados}</div>
            <div className={TABELA_VALOR_CELL_CLASS}>{l.retidos}</div>
            <div className={cn(TABELA_VALOR_CELL_CLASS, "!border-r-0")}>{l.cancelados}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const COR_TIPO: Record<TipoRetencao, string> = {
  "Sem concessão": "var(--success)",
  Desconto: "var(--warning)",
  "Troca de plano": "color-mix(in oklab, var(--primary) 70%, transparent)",
  "Troca de plano + desconto": "var(--danger)",
  Negociação: "color-mix(in oklab, var(--warning) 55%, transparent)",
  Outros: "var(--muted-foreground)",
};

const GRID_ATENDIMENTOS: CSSProperties = { gridTemplateColumns: "0.7fr 1fr 0.9fr 2.4fr 1.8fr 1.6fr" };
const GRID_MOTIVOS: CSSProperties = { gridTemplateColumns: "4fr 1fr" };

/* ───────── Dialog ───────── */

export function OperadorTecnicoDialog({
  operador,
  atendimentos,
  meta,
  txEquipe,
  txPolo,
  onClose,
}: {
  operador: OperadorLinha | null;
  atendimentos: AtendimentoTecnico[];
  meta: number;
  /** Taxa da equipe do supervisor do operador (fração). */
  txEquipe: number | null;
  /** Taxa do polo (fração). */
  txPolo: number | null;
  onClose: () => void;
}) {
  const temas = useMemo(() => agrupar(atendimentos, (a) => a.tema), [atendimentos]);
  const marcas = useMemo(() => agrupar(atendimentos, (a) => formatMarca(a.marca)), [atendimentos]);
  const motivosCancelados = useMemo(
    () =>
      agrupar(
        atendimentos.filter((a) => a.classe === "cancelado"),
        (a) => `${a.motivo} / ${a.submotivo}`,
      ),
    [atendimentos],
  );
  const porHora = useMemo(() => {
    const mapa = new Map<number, { hora: number; label: string; retidos: number; cancelados: number }>();
    for (const a of atendimentos) {
      if (a.bucket === null) continue;
      const agg = mapa.get(a.bucket) ?? { hora: a.bucket, label: a.bucketLabel ?? "", retidos: 0, cancelados: 0 };
      if (a.classe === "cancelado") agg.cancelados += 1;
      else agg.retidos += 1;
      mapa.set(a.bucket, agg);
    }
    // Não pula hora vazia: preenche do primeiro ao último bucket do operador
    // (7 = "< 08", 8..19, 20 = "≥ 20"), com as horas sem atendimento zeradas.
    const buckets = [...mapa.keys()];
    if (buckets.length === 0) return [];
    const inicio = Math.min(...buckets);
    const fim = Math.max(...buckets);
    const labelDe = (h: number) => (h === 7 ? "< 08" : h === 20 ? "≥ 20" : `${String(h).padStart(2, "0")}:00`);
    const horas = [];
    for (let h = inicio; h <= fim; h++) {
      horas.push(mapa.get(h) ?? { hora: h, label: labelDe(h), retidos: 0, cancelados: 0 });
    }
    return horas;
  }, [atendimentos]);
  const tipos = useMemo(() => {
    const cont = new Map<TipoRetencao, number>();
    for (const a of atendimentos) {
      if (a.classe !== "retido") continue;
      const t = a.tipoRetencao ?? "Outros";
      cont.set(t, (cont.get(t) ?? 0) + 1);
    }
    return TIPOS_RETENCAO.filter((t) => cont.has(t)).map((t) => ({ tipo: t, qtd: cont.get(t)! }));
  }, [atendimentos]);
  const totalRetidos = tipos.reduce((acc, t) => acc + t.qtd, 0);

  // Portal fora de [data-page]: resolve a fonte do tema no container real.
  const elementoEscopo =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>('[data-page="reports-consolidado"]')
      : null;
  const fontFamily = elementoEscopo ? getComputedStyle(elementoEscopo).fontFamily : undefined;

  return (
    <Dialog open={operador !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-page="reports-consolidado"
        className="max-h-[90vh] overflow-y-auto scrollbar-tema sm:max-w-6xl bg-background border-border/80 p-6 shadow-2xl"
        style={fontFamily ? { fontFamily } : undefined}
      >
        {operador && (
          <div className="space-y-5">
            {/* Cabeçalho: quem é + contexto (equipe, polo, meta) */}
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-foreground text-2xl font-semibold tracking-tight">{operador.login}</DialogTitle>
              <p className="text-muted-foreground text-sm">Gestor responsável: {operador.supervisor}</p>
              <p className="text-muted-foreground text-sm">
                {/* Layout do Figma: só a taxa da equipe colorida; separadores com respiro. */}
                Equipe <span className={classeTx(txEquipe, meta)}>{formatTx(txEquipe)}</span>
                <span className="mx-3">·</span>Polo {formatTx(txPolo)}
                <span className="mx-3">·</span>Meta {meta}%
              </p>
            </DialogHeader>

            {/* Números do dia — só a taxa tem cor */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Tx Retenção" valor={formatTx(operador.txRetencao)} classe={classeTx(operador.txRetencao, meta)} />
              <Stat label="Pedidos" valor={operador.pedidos} />
              <Stat label="Retidos" valor={operador.retidos} />
              <Stat label="Cancelados" valor={operador.cancelados} />
              <Stat label="Abortados" valor={operador.abortados} />
            </div>

            {atendimentos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem atendimentos na base do dia.</p>
            ) : (
              <>
                <Secao titulo="Resultado por hora">
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${Math.max(porHora.length, 1)}, minmax(0, 1fr))` }}
                  >
                    {porHora.map((h) => {
                      const tx = txDe(h);
                      const ruim = abaixoDaMeta(tx, meta);
                      const pedidos = h.retidos + h.cancelados;
                      return (
                        <div key={h.hora} className="text-center">
                          <p className="ds-body text-foreground pb-1 text-xs font-bold uppercase">{rotuloHora(h.label)}</p>
                          {tx === null ? (
                            // Hora sem atendimento: só o contorno, sem fundo.
                            <div className="text-foreground/70 rounded border border-border/60 px-1 py-1 text-xs">
                              0 pedidos
                            </div>
                          ) : (
                            <div
                              className="rounded px-1 py-1 text-xs"
                              style={{
                                background: `color-mix(in oklab, ${ruim ? "var(--danger)" : "var(--success)"} 18%, transparent)`,
                              }}
                              title={`${h.retidos} retidos · ${h.cancelados} cancelados`}
                            >
                              <span className={cn("font-semibold", ruim ? "text-danger" : "text-success")}>
                                {Math.round(tx * 100)}%
                              </span>
                              <span className="text-foreground/70"> · {pedidos}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Secao>

                <Secao titulo="Resultado por tema">
                  <TabelaAgregado primeira="Tema" linhas={temas} meta={meta} />
                </Secao>

                {tipos.length > 0 && (
                  <Secao titulo="Como retém">
                    <div className="space-y-2">
                      <div className="flex h-3 w-full overflow-hidden rounded-full">
                        {tipos.map((t) => (
                          <div
                            key={t.tipo}
                            style={{ width: `${(t.qtd / totalRetidos) * 100}%`, background: COR_TIPO[t.tipo] }}
                            title={`${t.tipo}: ${t.qtd}`}
                          />
                        ))}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
                        {tipos.map((t) => (
                          <span key={t.tipo} className="inline-flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="inline-block h-2 w-2 rounded-[2px]"
                              style={{ background: COR_TIPO[t.tipo] }}
                            />
                            {t.tipo} <span className="text-foreground">{t.qtd}</span> ·{" "}
                            {Math.round((t.qtd / totalRetidos) * 100)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </Secao>
                )}

                {motivosCancelados.length > 0 && (
                  <Secao titulo="Motivos dos cancelamentos">
                    <div className="overflow-x-auto">
                      <div className="min-w-[480px]">
                        <Cabecalho grid={GRID_MOTIVOS} colunas={["Motivo / Submotivo", "Cancelados"]} />
                        {motivosCancelados.map((m) => (
                          <div key={m.chave} className={cn(TABELA_LINHA_CLASS, "border-t border-border/40")} style={GRID_MOTIVOS}>
                            <div className={cn(TABELA_NOME_CELL_CLASS, "text-foreground")}>{m.chave}</div>
                            <div className={cn(TABELA_VALOR_CELL_CLASS, "!border-r-0")}>{m.cancelados}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Secao>
                )}

                <Secao titulo="Resultado por marca">
                  <TabelaAgregado primeira="Marca" linhas={marcas} meta={meta} />
                </Secao>

                <Secao titulo={`Atendimentos do dia (${atendimentos.length})`}>
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      <Cabecalho
                        grid={GRID_ATENDIMENTOS}
                        colunas={["Hora", "Contrato", "Resultado", "Motivo / Submotivo", "Como reteve", "Marca / Unidade"]}
                      />
                      {atendimentos.map((a, i) => (
                        <div
                          key={`${a.contrato}-${i}`}
                          className={cn(TABELA_LINHA_CLASS, "border-t border-border/40")}
                          style={GRID_ATENDIMENTOS}
                        >
                          <div className={TABELA_VALOR_CELL_CLASS}>{a.horario ?? "—"}</div>
                          <div className={TABELA_VALOR_CELL_CLASS}>{a.contrato || "—"}</div>
                          <div className={TABELA_VALOR_CELL_CLASS}>
                            <span
                              className={a.classe === "cancelado" ? "text-danger" : "text-success"}
                              style={{ fontWeight: 600 }}
                            >
                              {a.classe === "cancelado" ? "Cancelado" : "Retido"}
                            </span>
                          </div>
                          <div className="ds-body text-foreground min-w-0 truncate border-r border-border/30 px-3 py-2">
                            {a.motivo}
                          </div>
                          <div className="ds-body text-foreground min-w-0 truncate border-r border-border/30 px-3 py-2">
                            {a.classe === "retido" ? (
                              (a.tipoRetencao ?? "—")
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          <div className="ds-body text-foreground min-w-0 truncate px-3 py-2">{formatMarca(a.marca)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Secao>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
