"use client";

import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import {
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemDado,
  ValorSemantico,
  corNomeOperador,
} from "@/components/gestor/tabela-padrao";
import type { OperadorLinha, SupervisorLinha } from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";

import { abaixoDaMeta, formatTx } from "./format";

const NOME_CELL =
  "ds-body min-w-0 truncate px-3 py-2 text-center border-r border-border/30 font-medium";
const ULTIMA = "!border-r-0";

/*
 * Linha no padrão da EquipeTable de /s/reports/consolidado: sem divisória
 * entre linhas, borda esquerda na cor do veredito + leve deslocamento no
 * hover. A altura vem da célula de taxa com barra (CelulaTx com `barra`).
 */
const LINHA_CONSOLIDADO = cn(
  TABELA_LINHA_CLASS.replace("hover:bg-muted/40", ""),
  "group border-l-2 border-l-transparent transition-[background-color,border-color,transform] duration-200 ease-out",
);

/*
 * Fundo da linha em classe (não inline, senão o hover não vence) com os
 * mesmos tons do hover semântico de reports-consolidado.css no /s:
 * abaixo da meta = --danger 5% em repouso → 10% no hover; dentro da meta =
 * sem fundo → --success 7% no hover.
 */
const FUNDO_RUIM =
  "bg-[color-mix(in_oklch,var(--danger)_5%,transparent)] hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]";
const FUNDO_BOM = "hover:bg-[color-mix(in_oklch,var(--success)_7%,transparent)]";

function hoverLinha(clicavel: boolean, ruim: boolean): string {
  return clicavel
    ? cn(
        "cursor-pointer hover:translate-x-0.5",
        ruim ? cn(FUNDO_RUIM, "hover:border-l-[var(--danger)]") : cn(FUNDO_BOM, "hover:border-l-[var(--success)]"),
      )
    : "hover:border-l-transparent hover:translate-x-0";
}

/**
 * Dentro de cada turno (na ordem em que aparecem: manhã, depois tarde),
 * maior taxa → menor; sem taxa no fim. Empate: mais pedidos primeiro.
 */
function ordenarSupervisores(lista: SupervisorLinha[]): SupervisorLinha[] {
  const ordemTurno = new Map<SupervisorLinha["turno"], number>();
  lista.forEach((s) => {
    if (!ordemTurno.has(s.turno)) ordemTurno.set(s.turno, ordemTurno.size);
  });
  return [...lista].sort(
    (a, b) =>
      (ordemTurno.get(a.turno) ?? 0) - (ordemTurno.get(b.turno) ?? 0) ||
      (b.txRetencao ?? -1) - (a.txRetencao ?? -1) ||
      b.pedidos - a.pedidos,
  );
}

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
  barra = false,
}: {
  tx: number | null;
  meta: number;
  className?: string;
  /**
   * Visual da coluna "Tx Retenção" da EquipeTable (/s/reports/consolidado):
   * texto colorido sem bolinha + barra fina de progresso embaixo.
   */
  barra?: boolean;
}) {
  if (barra) {
    const cor = tx !== null && abaixoDaMeta(tx, meta) ? "var(--danger)" : "var(--success)";
    return (
      <div
        className={cn(
          "ds-mono-sm min-w-0 flex flex-col items-center justify-center gap-1 px-3 py-2",
          className,
        )}
      >
        {tx === null ? (
          <ValorSemDado />
        ) : (
          <span style={{ color: cor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {formatTx(tx)}
          </span>
        )}
        {/* Sem taxa: placeholder do mesmo tamanho, pra linha não ficar mais fina. */}
        <div
          aria-hidden="true"
          className={cn(
            "h-1 w-12 overflow-hidden rounded-full",
            tx === null ? "bg-muted/20" : "bg-muted/50",
          )}
        >
          {tx !== null && (
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, tx * 100))}%`, background: cor }}
            />
          )}
        </div>
      </div>
    );
  }

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
  rotuloTotais,
}: {
  operadores: OperadorLinha[];
  meta: number;
  onSelecionar: (op: OperadorLinha) => void;
  mostrarSupervisor?: boolean;
  /** Com valor, fecha a tabela com uma linha de totais (ex.: "Equipe"). */
  rotuloTotais?: string;
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
      <div data-coord-tabela className="min-w-[680px] overflow-x-clip">
        <Cabecalho grid={grid} colunas={colunas} fixo={Boolean(alturaMaxima)} />
        {operadores.map((op) => {
          const ruim =
            !op.semDado && op.txRetencao !== null && abaixoDaMeta(op.txRetencao, meta);
          return (
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
            className={cn(LINHA_CONSOLIDADO, "outline-none", hoverLinha(!op.semDado, ruim))}
            style={{ ...grid, opacity: op.semDado ? 0.65 : 1 }}
          >
            <div
              className={NOME_CELL}
              style={{ color: corNomeOperador({ semDado: op.semDado, ruim }) }}
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
              barra
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
          );
        })}

        {rotuloTotais && operadores.length > 0 && (
          <LinhaTotais
            rotulo={rotuloTotais}
            grid={grid}
            meta={meta}
            colunasVazias={mostrarSupervisor ? 1 : 0}
            retidos={operadores.reduce((acc, op) => acc + (op.semDado ? 0 : op.retidos), 0)}
            cancelados={operadores.reduce((acc, op) => acc + (op.semDado ? 0 : op.cancelados), 0)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Linha de totais no visual da linha EQUIPE do /s (mesmo da linha POLO da
 * tabela de supervisores). Taxa = retidos ÷ (retidos + cancelados), nunca
 * média das taxas. `extras` = valores das colunas depois de Cancelados.
 */
function LinhaTotais({
  rotulo,
  grid,
  meta,
  retidos,
  cancelados,
  colunasVazias = 0,
  extras = [],
}: {
  rotulo: string;
  grid: CSSProperties;
  meta: number;
  retidos: number;
  cancelados: number;
  /** Colunas sem total entre o rótulo e a taxa (ex.: "Supervisor"). */
  colunasVazias?: number;
  extras?: number[];
}) {
  const pedidos = retidos + cancelados;
  const tx = pedidos > 0 ? retidos / pedidos : null;
  // Mesmo fundo/fonte/cor do cabeçalho, só 1px em cima, divisórias border/50.
  // Tema claro: coordenador-consolidado.css ([data-coord-totais]).
  const celula = "min-w-0 px-3 py-2.5 text-center border-r border-border/50";
  const valores = [pedidos, retidos, cancelados, ...extras];

  return (
    <div
      data-coord-totais
      className="ds-body grid items-center gap-0 bg-muted/40 font-bold text-foreground tracking-wide uppercase"
      style={{ ...grid, borderTop: "1px solid var(--border)" }}
    >
      <div className={cn(celula, "truncate")}>{rotulo}</div>
      {Array.from({ length: colunasVazias }, (_, i) => (
        <div key={`vazia-${i}`} className={celula} />
      ))}
      <div className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 border-r border-border/50">
        {tx === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <span
              style={{
                color: abaixoDaMeta(tx, meta) ? "var(--danger)" : "var(--success)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTx(tx)}
            </span>
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: abaixoDaMeta(tx, meta) ? "var(--danger)" : "var(--success)" }}
            />
          </>
        )}
      </div>
      {valores.map((v, i) => (
        <div
          key={i}
          className={cn(celula, i === valores.length - 1 && ULTIMA)}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {v.toLocaleString("pt-BR")}
        </div>
      ))}
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
  const linhas = ordenarSupervisores(supervisores);

  // Portal só depois de montado (sem `document` no SSR) — mesmo padrão do
  // overlay da engrenagem (ConfigMetaPoloPopover).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao abrir, rola até a linha do supervisor ficar no topo da tela (abaixo do
  // header do app — scroll-mt-20 na linha). Roda depois do commit, com o
  // painel anterior já fechado e o novo já aberto, então a posição é a final.
  useEffect(() => {
    if (!aberto) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-supervisor-linha="${CSS.escape(aberto)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [aberto]);

  // Esc também fecha. Rolar a página NÃO fecha (pedido explícito).
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  return (
    <div className="overflow-x-auto">
      {/*
        Desfoque com um supervisor aberto: cobre a tela inteira (z-40) e só a
        linha do supervisor + o painel dos operadores ficam acima (z-[45]).
        Clique fora (no desfoque) ou de novo no nome fecha.
      */}
      {mounted &&
        createPortal(
          <div
            aria-hidden="true"
            onClick={() => setAberto(null)}
            className={cn(
              "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all duration-200",
              aberto ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />,
          document.body,
        )}

      {/* overflow-x-clip: o translate-x do hover não vaza pro scroll do card. */}
      <div data-coord-tabela className="min-w-[760px] overflow-x-clip">
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
        {linhas.map((s, i) => {
          const estaAberto = aberto === s.gestorId;
          const inicioTarde =
            s.turno === "tarde" &&
            linhas[i - 1]?.turno !== "tarde" &&
            i > 0;
          const ruim = s.txRetencao !== null && abaixoDaMeta(s.txRetencao, meta);
          const equipe = ordenarOperadores(
            operadores.filter((op) => op.gestorId === s.gestorId),
          );

          return (
            <Fragment key={s.gestorId}>
              <button
                type="button"
                data-supervisor-linha={s.gestorId}
                onClick={() => setAberto(estaAberto ? null : s.gestorId)}
                aria-expanded={estaAberto}
                className={cn(
                  LINHA_CONSOLIDADO,
                  "w-full scroll-mt-20 text-left",
                  hoverLinha(true, ruim),
                  // Só a virada manhã → tarde leva divisória (linhas sem borda, como no /s).
                  inicioTarde && "border-t-2 border-t-border",
                  // Acima do desfoque, com fundo SÓLIDO (o muted/40 translúcido
                  // deixaria o desfoque aparecer através da linha).
                  estaAberto && "relative z-[45]",
                )}
                style={{
                  ...GRID_SUPERVISORES,
                  // Aberta: fundo sólido na hora, sem fade (o fade de 200ms do
                  // background fazia a linha "piscar" sobre o blur); borda e
                  // deslocamento do hover continuam animados.
                  ...(estaAberto
                    ? {
                        background: "color-mix(in srgb, var(--muted) 40%, var(--background))",
                        transition: "border-color 200ms ease-out, transform 200ms ease-out",
                      }
                    : {}),
                }}
              >
                {/* Nome centralizado como na EquipeTable; chevron fixo à esquerda. */}
                <div
                  className="ds-body relative flex min-w-0 items-center justify-center border-r border-border/30 px-8 py-2 font-medium"
                  style={{ color: corNomeOperador({ ruim }) }}
                >
                  <span className="text-muted-foreground/70 absolute left-3">
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
                  barra
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
                <div
                  className="relative z-[45] border-t border-border/40 px-4 py-4"
                  style={{ background: "color-mix(in srgb, var(--muted) 20%, var(--background))" }}
                >
                  {/* Sem caixa alta; no escuro, mais claro que o muted (estava apagado demais). */}
                  <p className="ds-small text-muted-foreground dark:text-foreground/80 mb-3">
                    Operadores de {s.nome} · Clique no operador para ver o detalhe técnico
                  </p>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <TabelaOperadores
                      operadores={equipe}
                      meta={meta}
                      onSelecionar={onSelecionarOperador}
                      rotuloTotais="Equipe"
                    />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}

        {/* Linha POLO — mesmo padrão da linha EQUIPE da EquipeTable
            (/s/reports/consolidado). */}
        {supervisores.length > 0 && (
          <LinhaTotais
            rotulo="Polo"
            grid={GRID_SUPERVISORES}
            meta={meta}
            retidos={supervisores.reduce((acc, s) => acc + s.retidos, 0)}
            cancelados={supervisores.reduce((acc, s) => acc + s.cancelados, 0)}
            extras={[
              supervisores.reduce((acc, s) => acc + s.operadores, 0),
              supervisores.reduce((acc, s) => acc + s.abaixoDaMeta, 0),
            ]}
          />
        )}
      </div>
    </div>
  );
}
