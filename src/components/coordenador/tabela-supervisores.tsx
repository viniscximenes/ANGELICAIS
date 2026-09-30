"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import {
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemDado,
  ValorSemantico,
} from "@/components/gestor/tabela-padrao";
import type { OperadorLinha, SupervisorLinha } from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";

import { abaixoDaMeta, formatTx } from "./format";

const NOME_CELL =
  "ds-body min-w-0 truncate px-3 py-2 text-center border-r border-border/30 font-medium";
const ULTIMA = "!border-r-0";

/**
 * Mesmo cabeçalho da EquipeTable de /s/reports/consolidado (classe local de lá:
 * ds-body + font-bold + text-foreground + uppercase), células com
 * TABELA_HEADER_CELL_CLASS (whitespace-nowrap, sem quebra de linha).
 */
export const CABECALHO_CONSOLIDADO_CLASS =
  "ds-body grid gap-0 bg-muted/40 font-bold text-foreground tracking-wide uppercase";

export function Cabecalho({
  colunas,
  grid,
  fixo = false,
}: {
  colunas: string[];
  grid: CSSProperties;
  /** Cabeçalho grudado no topo de uma área com rolagem (fundo sólido). */
  fixo?: boolean;
}) {
  return (
    <div
      className={cn(CABECALHO_CONSOLIDADO_CLASS, fixo && "sticky top-0 z-10")}
      style={{
        ...grid,
        ...TABELA_HEADER_BORDA,
        // bg-muted/40 é translúcido: fixo precisa de fundo sólido equivalente
        // pra as linhas não aparecerem por trás ao rolar.
        ...(fixo ? { background: "color-mix(in srgb, var(--muted) 40%, var(--background))" } : {}),
      }}
    >
      {colunas.map((c, i) => (
        <div
          key={c}
          className={
            i === colunas.length - 1
              ? TABELA_HEADER_CELL_ULTIMA_CLASS
              : TABELA_HEADER_CELL_CLASS
          }
        >
          {c}
        </div>
      ))}
    </div>
  );
}

/** Só o valor da taxa colorido (a linha fica neutra, a pedido). */
export function CelulaTx({
  tx,
  meta,
  className,
}: {
  tx: number | null;
  meta: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ds-mono-sm min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 text-center",
        className,
      )}
    >
      {tx === null ? (
        <ValorSemDado />
      ) : (
        <ValorSemantico ruim={abaixoDaMeta(tx, meta)}>
          {formatTx(tx)}
        </ValorSemantico>
      )}
    </div>
  );
}

/* ───────── Operadores de uma supervisão (drill-down) ───────── */

const GRID_OPERADORES: CSSProperties = {
  gridTemplateColumns: "2.2fr 1.2fr 1fr 1fr 1fr",
};

export function TabelaOperadores({
  operadores,
  meta,
  onSelecionar,
  mostrarSupervisor = false,
  alturaMaxima,
}: {
  operadores: OperadorLinha[];
  meta: number;
  onSelecionar: (op: OperadorLinha) => void;
  mostrarSupervisor?: boolean;
  /** Com valor (px), a tabela rola dentro dessa altura com o cabeçalho fixo. */
  alturaMaxima?: number;
}) {
  const grid: CSSProperties = mostrarSupervisor
    ? { gridTemplateColumns: "2fr 1.8fr 1.1fr 0.9fr 0.9fr 0.9fr" }
    : GRID_OPERADORES;
  const colunas = mostrarSupervisor
    ? [
        "Operador",
        "Supervisor",
        "Tx Retenção",
        "Pedidos",
        "Retidos",
        "Cancelados",
      ]
    : ["Operador", "Tx Retenção", "Pedidos", "Retidos", "Cancelados"];

  return (
    <div
      className={cn("overflow-x-auto", alturaMaxima && "scrollbar-tema overflow-y-auto")}
      style={alturaMaxima ? { maxHeight: alturaMaxima } : undefined}
    >
      <div className="min-w-[680px]">
        <Cabecalho grid={grid} colunas={colunas} fixo={Boolean(alturaMaxima)} />
        {operadores.map((op) => (
          // Linha inteira clicável (mesmo padrão da EquipeTable do
          // Consolidado): o hover da linha já sinaliza o clique, sem sublinhado.
          <div
            key={op.email}
            role={op.semDado ? undefined : "button"}
            tabIndex={op.semDado ? undefined : 0}
            onClick={op.semDado ? undefined : () => onSelecionar(op)}
            onKeyDown={
              op.semDado
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelecionar(op);
                    }
                  }
            }
            title={op.semDado ? undefined : "Ver detalhe técnico do operador"}
            className={cn(
              TABELA_LINHA_CLASS,
              "border-t border-border/40 outline-none",
              !op.semDado && "cursor-pointer",
            )}
            style={grid}
          >
            <div
              className={cn(
                NOME_CELL,
                op.semDado ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {op.login}
            </div>
            {mostrarSupervisor && (
              <div className={`${TABELA_VALOR_CELL_CLASS} truncate`}>
                {op.supervisor}
              </div>
            )}
            <CelulaTx
              tx={op.txRetencao}
              meta={meta}
              className="border-r border-border/30"
            />
            <div className={TABELA_VALOR_CELL_CLASS}>
              {op.semDado ? <ValorSemDado /> : op.pedidos}
            </div>
            <div className={TABELA_VALOR_CELL_CLASS}>
              {op.semDado ? <ValorSemDado /> : op.retidos}
            </div>
            <div className={cn(TABELA_VALOR_CELL_CLASS, ULTIMA)}>
              {op.semDado ? <ValorSemDado /> : op.cancelados}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Maior taxa → menor taxa → operadores sem dado (sem pedidos no dia ou fora
 * da base). Empate de taxa: quem tem mais pedidos primeiro.
 */
function ordenarOperadores(lista: OperadorLinha[]): OperadorLinha[] {
  const semTaxa = (o: OperadorLinha) => o.semDado || o.txRetencao === null;
  return [...lista].sort((a, b) => {
    if (semTaxa(a) !== semTaxa(b)) return semTaxa(a) ? 1 : -1;
    if (semTaxa(a))
      return (
        Number(a.semDado) - Number(b.semDado) || a.login.localeCompare(b.login)
      );
    return (b.txRetencao ?? 0) - (a.txRetencao ?? 0) || b.pedidos - a.pedidos;
  });
}

/* ───────── Supervisores ───────── */

const GRID_SUPERVISORES: CSSProperties = {
  gridTemplateColumns: "2.2fr 1.2fr 1fr 1fr 1fr 1fr 1fr",
};

export function TabelaSupervisores({
  supervisores,
  operadores,
  meta,
  onSelecionarOperador,
}: {
  supervisores: SupervisorLinha[];
  operadores: OperadorLinha[];
  meta: number;
  onSelecionarOperador: (op: OperadorLinha) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <Cabecalho
          grid={GRID_SUPERVISORES}
          colunas={[
            "Supervisor",
            "Tx Retenção",
            "Pedidos",
            "Retidos",
            "Cancelados",
            "Operadores",
            "Abaixo meta",
          ]}
        />
        {supervisores.map((s, i) => {
          const estaAberto = aberto === s.gestorId;
          const inicioTarde =
            s.turno === "tarde" &&
            supervisores[i - 1]?.turno !== "tarde" &&
            i > 0;
          const equipe = ordenarOperadores(
            operadores.filter((op) => op.gestorId === s.gestorId),
          );

          return (
            <Fragment key={s.gestorId}>
              <button
                type="button"
                onClick={() => setAberto(estaAberto ? null : s.gestorId)}
                aria-expanded={estaAberto}
                className={cn(
                  TABELA_LINHA_CLASS,
                  "w-full cursor-pointer text-left",
                  inicioTarde
                    ? "border-t-2 border-border"
                    : "border-t border-border/40",
                  estaAberto && "bg-muted/40",
                )}
                style={GRID_SUPERVISORES}
              >
                <div className="ds-body text-foreground flex min-w-0 items-center gap-2 border-r border-border/30 px-3 py-2 font-medium">
                  <span className="text-muted-foreground/70 shrink-0">
                    {estaAberto ? (
                      <IconChevronDown size={14} />
                    ) : (
                      <IconChevronRight size={14} />
                    )}
                  </span>
                  <span className="truncate">{s.nome}</span>
                </div>
                <CelulaTx
                  tx={s.txRetencao}
                  meta={meta}
                  className="border-r border-border/30"
                />
                <div className={TABELA_VALOR_CELL_CLASS}>{s.pedidos}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{s.retidos}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{s.cancelados}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{s.operadores}</div>
                <div className={cn(TABELA_VALOR_CELL_CLASS, ULTIMA)}>
                  {s.abaixoDaMeta}
                </div>
              </button>

              {estaAberto && (
                <div className="border-t border-border/40 bg-muted/20 px-4 py-4">
                  <p className="ds-small text-muted-foreground mb-3 tracking-wider uppercase">
                    Operadores de {s.nome} · clique no operador para ver o
                    detalhe técnico
                  </p>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <TabelaOperadores
                      operadores={equipe}
                      meta={meta}
                      onSelecionar={onSelecionarOperador}
                    />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}

        {/* Linha POLO — mesmo padrão da linha EQUIPE da EquipeTable
            (/s/reports/consolidado). Taxa calculada com os totais
            (retidos ÷ (retidos + cancelados)), nunca média das taxas. */}
        {supervisores.length > 0 &&
          (() => {
            const retidos = supervisores.reduce((acc, s) => acc + s.retidos, 0);
            const cancelados = supervisores.reduce(
              (acc, s) => acc + s.cancelados,
              0,
            );
            const pedidos = retidos + cancelados;
            const tx = pedidos > 0 ? retidos / pedidos : null;
            const operadoresPolo = supervisores.reduce(
              (acc, s) => acc + s.operadores,
              0,
            );
            const abaixoPolo = supervisores.reduce(
              (acc, s) => acc + s.abaixoDaMeta,
              0,
            );
            const celula =
              "min-w-0 px-3 py-2.5 text-center border-r border-border/40";
            return (
              <div
                className="ds-body grid items-center gap-0 bg-muted/20 font-bold"
                style={{
                  ...GRID_SUPERVISORES,
                  borderTop: "2px solid var(--border)",
                  borderBottom: "2px double var(--border)",
                }}
              >
                <div
                  className={cn(
                    celula,
                    "text-foreground truncate tracking-wide",
                  )}
                >
                  POLO
                </div>
                <div className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 border-r border-border/40">
                  {tx === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <>
                      <span
                        style={{
                          color: abaixoDaMeta(tx, meta)
                            ? "var(--danger)"
                            : "var(--success)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatTx(tx)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          background: abaixoDaMeta(tx, meta)
                            ? "var(--danger)"
                            : "var(--success)",
                        }}
                      />
                    </>
                  )}
                </div>
                {[pedidos, retidos, cancelados, operadoresPolo].map((v, i) => (
                  <div
                    key={i}
                    className={celula}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {v.toLocaleString("pt-BR")}
                  </div>
                ))}
                <div
                  className="min-w-0 px-3 py-2.5 text-center"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {abaixoPolo}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
