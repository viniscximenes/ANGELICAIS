"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { OperadorLinha, SupervisorLinha, Turno } from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";

import {
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";

import { TURNO_LABEL, abaixoDaMeta, classeTx, formatTx } from "./format";
import { Cabecalho, CelulaTx } from "./tabela-supervisores";

function SubTitulo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
      <p className="ds-small text-muted-foreground mt-1">{texto}</p>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-muted-foreground px-2 py-6 text-center text-sm">{texto}</p>;
}

/* ───────── Mapa de prioridade (volume × taxa) ───────── */

const GRID_PRIORIDADE = { gridTemplateColumns: "1.6fr 1.4fr 1.1fr 0.9fr 0.9fr" };

type PosicaoRotulo = "insideTopLeft" | "insideTopRight" | "insideBottomLeft" | "insideBottomRight";

function rotuloArea(value: string, position: PosicaoRotulo, destaque = false) {
  return {
    value,
    position,
    fill: destaque ? "var(--danger)" : "var(--muted-foreground)",
    fontSize: 11,
    fontWeight: destaque ? 700 : 500,
    offset: 8,
  };
}

/**
 * Cada ponto é um operador: X = pedidos no dia, Y = taxa de retenção.
 * Linhas: meta (horizontal) e média de pedidos do polo (vertical). A área de
 * PRIORIDADE (muito volume + abaixo da meta) é quem mais tira pontos do polo.
 */
export function MatrizVolumeTaxa({
  operadores,
  meta,
  onSelecionar,
}: {
  operadores: OperadorLinha[];
  meta: number;
  onSelecionar: (op: OperadorLinha) => void;
}) {
  const [turno, setTurno] = useState<Turno | "todos">("todos");
  const ativos = operadores.filter((o) => !o.semDado && o.pedidos > 0 && (turno === "todos" || o.turno === turno));
  const mediaPedidos = ativos.length > 0 ? ativos.reduce((a, o) => a + o.pedidos, 0) / ativos.length : 0;
  const pontos = ativos.map((o) => ({ ...o, tx: +((o.txRetencao ?? 0) * 100).toFixed(1) }));
  const xMax = Math.max(1, ...pontos.map((o) => o.pedidos)) + 1;
  const prioridade = pontos
    .filter((o) => o.pedidos >= mediaPedidos && abaixoDaMeta(o.txRetencao, meta))
    .sort((a, b) => b.cancelados - a.cancelados || b.pedidos - a.pedidos);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SubTitulo
          titulo="Mapa de prioridade dos operadores"
          texto="Cada ponto é um operador. Quanto mais à direita, mais atendimentos; quanto mais alto, melhor a taxa. A área vermelha reúne quem atende muito e está abaixo da meta: é por onde começar."
        />
        <div className="border-border inline-flex rounded-md border p-0.5 text-xs">
          {(["todos", "manha", "tarde"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTurno(t)}
              className={cn(
                "cursor-pointer rounded px-2.5 py-1 transition-colors",
                turno === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "todos" ? "Todos" : TURNO_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          Linha horizontal: meta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="8" height="14" aria-hidden="true">
            <line x1="4" y1="1" x2="4" y2="13" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          Linha vertical: média de atendimentos
        </span>
      </div>

      <div className="h-[360px] w-full [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart accessibilityLayer={false} margin={{ top: 10, right: 16, left: -10, bottom: 18 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.3} strokeDasharray="4 4" />
            {/* Só a área de prioridade é destacada (sem rótulos nas demais). */}
            <ReferenceArea
              x1={mediaPedidos}
              x2={xMax}
              y1={0}
              y2={meta}
              fill="var(--danger)"
              fillOpacity={0.08}
              label={rotuloArea(`Prioridade (${prioridade.length})`, "insideBottomRight", true)}
            />
            <XAxis
              type="number"
              dataKey="pedidos"
              name="Pedidos"
              domain={[0, xMax]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              label={{ value: "Pedidos no dia →", position: "insideBottom", offset: -12, fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="tx"
              name="Taxa"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <ZAxis range={[60, 60]} />
            <ReferenceLine
              y={meta}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              x={mediaPedidos}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const o = payload[0].payload as (typeof pontos)[number];
                return (
                  <div className="bg-popover border-border/80 rounded-lg border p-3 font-sans text-xs shadow-md">
                    <p className="text-foreground text-sm font-semibold">{o.login}</p>
                    <p className="text-muted-foreground">
                      {o.supervisor}
                      {o.turno ? ` · ${TURNO_LABEL[o.turno]}` : ""}
                    </p>
                    <p className="mt-1">
                      <span className={`font-semibold ${classeTx(o.txRetencao, meta)}`}>{formatTx(o.txRetencao)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {o.pedidos} pedidos · {o.cancelados} cancelados
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={pontos}
              cursor="pointer"
              isAnimationActive={false}
              onClick={(p: unknown) => {
                const o = (p as { payload?: OperadorLinha })?.payload;
                if (o) onSelecionar(o);
              }}
            >
              {pontos.map((o) => (
                <Cell key={o.email} fill={abaixoDaMeta(o.txRetencao, meta) ? "var(--danger)" : "var(--success)"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        <p className="ds-small text-muted-foreground tracking-wider uppercase">
          Prioridade de acompanhamento ({prioridade.length}) · quem mais cancelou primeiro
        </p>
        {prioridade.length === 0 ? (
          <Vazio texto="Ninguém com volume acima da média e abaixo da meta." />
        ) : (
          <div className="max-h-[320px] overflow-y-auto scrollbar-tema">
            <div className="min-w-[640px]">
              <Cabecalho grid={GRID_PRIORIDADE} colunas={["Operador", "Supervisor", "Tx Retenção", "Pedidos", "Cancelados"]} />
              {prioridade.map((o) => (
                <div
                  key={o.email}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelecionar(o)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelecionar(o);
                    }
                  }}
                  title="Ver detalhe técnico do operador"
                  className={cn(TABELA_LINHA_CLASS, "cursor-pointer border-t border-border/40 outline-none")}
                  style={GRID_PRIORIDADE}
                >
                  <div className={cn(TABELA_NOME_CELL_CLASS, "text-foreground")}>{o.login}</div>
                  <div className={cn(TABELA_VALOR_CELL_CLASS, "truncate")}>{o.supervisor}</div>
                  <CelulaTx tx={o.txRetencao} meta={meta} className="border-r border-border/30" />
                  <div className={TABELA_VALOR_CELL_CLASS}>{o.pedidos}</div>
                  <div className={cn(TABELA_VALOR_CELL_CLASS, "!border-r-0")}>{o.cancelados}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Concentração de cancelamentos (Pareto) ───────── */

/* ───────── Operadores sem produção ───────── */

const GRID_SEM_PRODUCAO = { gridTemplateColumns: "1.4fr 1fr 4fr" };

export function SemProducao({
  operadores,
  supervisores,
}: {
  operadores: OperadorLinha[];
  supervisores: SupervisorLinha[];
}) {
  const semDado = operadores.filter((o) => o.semDado);
  const porSupervisor = supervisores
    .map((s) => ({ s, lista: semDado.filter((o) => o.gestorId === s.gestorId) }))
    .filter((g) => g.lista.length > 0);
  // Tamanho da equipe = quem atendeu (s.operadores) + quem não apareceu na base.
  const equipeTotal = (s: SupervisorLinha) => s.operadores + s.semProducao;
  const totalSem = porSupervisor.reduce((acc, g) => acc + g.lista.length, 0);
  const totalEquipes = supervisores.reduce((acc, s) => acc + equipeTotal(s), 0);
  const num = { fontVariantNumeric: "tabular-nums" as const };

  return (
    <div className="space-y-3">
      <SubTitulo
        titulo="Equipe sem atendimento no dia"
        texto="Operadores cadastrados nas equipes que não aparecem na base do dia (folga, falta, afastamento ou fora da fila)."
      />
      {porSupervisor.length === 0 ? (
        <Vazio texto="Todos os operadores cadastrados atenderam hoje." />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <Cabecalho grid={GRID_SEM_PRODUCAO} colunas={["Supervisor", "Sem atendimento", "Operadores"]} />
            {porSupervisor.map(({ s, lista }) => (
              <div key={s.gestorId} className={cn(TABELA_LINHA_CLASS, "border-t border-border/40")} style={GRID_SEM_PRODUCAO}>
                <div className={cn(TABELA_NOME_CELL_CLASS, "text-foreground")}>{s.nome}</div>
                <div className={TABELA_VALOR_CELL_CLASS} style={num}>
                  {lista.length} <span className="text-muted-foreground">de {equipeTotal(s)}</span>
                </div>
                <div className="ds-body text-muted-foreground min-w-0 px-3 py-2 text-center text-sm leading-relaxed">
                  {lista.map((o) => o.login).join(" · ")}
                </div>
              </div>
            ))}
            <div
              className="ds-body grid items-center gap-0 bg-muted/20 font-bold"
              style={{
                ...GRID_SEM_PRODUCAO,
                borderTop: "2px solid var(--border)",
                borderBottom: "2px double var(--border)",
              }}
            >
              <div className="text-foreground min-w-0 truncate border-r border-border/30 px-3 py-2.5 text-center">POLO</div>
              <div className="min-w-0 border-r border-border/30 px-3 py-2.5 text-center" style={num}>
                {totalSem} <span className="text-muted-foreground font-normal">de {totalEquipes}</span>
              </div>
              <div />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
