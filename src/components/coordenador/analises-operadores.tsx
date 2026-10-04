"use client";

import { useState } from "react";
import {
  CartesianGrid,
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

import { TURNO_LABEL, abaixoDaMeta, classeTx, formatTx } from "./format";
import { Cabecalho, TabelaOperadores } from "./tabela-supervisores";
import { Segmentado } from "@/components/dashboard/retencao/segmentado";

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

type PontoMapa = OperadorLinha & { tx: number; prioridade: boolean };

/** Etiqueta em caixa nas linhas de referência — mesmo desenho das etiquetas da Evolução do polo. */
function EtiquetaLinha({ x, y, texto, ancora }: { x: number; y: number; texto: string; ancora: "start" | "end" | "middle" }) {
  const largura = texto.length * 6.2 + 12;
  const xCaixa = ancora === "end" ? x - largura : ancora === "middle" ? x - largura / 2 : x;
  return (
    <g pointerEvents="none">
      <rect
        x={xCaixa}
        y={y - 10}
        width={largura}
        height={19}
        rx={4}
        fill="var(--background)"
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text
        x={xCaixa + largura / 2}
        y={y + 3.5}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--muted-foreground)"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {texto}
      </text>
    </g>
  );
}

function LegendaMapa({ meta, mediaPedidos }: { meta: number; mediaPedidos: number }) {
  const ponto = (cor: string, texto: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
      {texto}
    </span>
  );
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      {ponto("var(--success)", "Na meta")}
      {ponto("var(--danger)", "Abaixo da meta")}
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
        Meta {meta}%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="8" height="14" aria-hidden="true">
          <line x1="4" y1="1" x2="4" y2="13" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
        Média de pedidos ({mediaPedidos.toFixed(1).replace(".", ",")})
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-[2px]"
          style={{ background: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
        />
        Área de prioridade
      </span>
    </div>
  );
}

/**
 * Cada ponto é um operador: X = pedidos no dia, Y = taxa de retenção.
 * Linhas: meta (horizontal) e média de pedidos do polo (vertical). A área de
 * PRIORIDADE (volume acima da média + abaixo da meta) é quem mais tira pontos
 * do polo — esses pontos ficam em destaque e os demais esmaecidos.
 * Visual alinhado à Evolução do polo: legenda com as mesmas marcas, pontos com
 * anel na cor do fundo (separa pontos sobrepostos), etiquetas em caixa nas
 * linhas de referência, grade só horizontal e tooltip no mesmo formato.
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
  const pontos: PontoMapa[] = ativos.map((o) => ({
    ...o,
    tx: +((o.txRetencao ?? 0) * 100).toFixed(1),
    prioridade: o.pedidos >= mediaPedidos && abaixoDaMeta(o.txRetencao, meta),
  }));
  const xMax = Math.max(1, ...pontos.map((o) => o.pedidos)) + 1;
  const prioridade = pontos
    .filter((o) => o.prioridade)
    .sort((a, b) => b.cancelados - a.cancelados || b.pedidos - a.pedidos);

  return (
    // lg:h-full + flex-col: no trilho o card ocupa a altura do slide SEM
    // rolagem própria — o gráfico (flex-1) cede espaço e só a lista de
    // prioridade (embaixo) rola por dentro.
    <div className="flex flex-col gap-3 lg:h-full">
      <SubTitulo
        titulo="Gráfico prioridade - Operadores"
        texto="Cada ponto é um operador: mais à direita, mais pedidos; mais alto, melhor a taxa. A área vermelha é a prioridade. Clique num ponto para ver o detalhe."
      />
      {/* Mesmo toggle do "Divisor de Quartil" do /s (Segmentado: tokens
          --seg-*, destaque deslizando), logo abaixo do título como lá. */}
      <div className="self-start">
      <Segmentado
        ariaLabel="Turno do gráfico de prioridade"
        grupo="coord-prioridade-turno"
        opcoes={[
          { valor: "todos", rotulo: "Todos" },
          { valor: "manha", rotulo: TURNO_LABEL.manha },
          { valor: "tarde", rotulo: TURNO_LABEL.tarde },
        ]}
        valor={turno}
        onChange={setTurno}
      />
      </div>

      <LegendaMapa meta={meta} mediaPedidos={mediaPedidos} />

      <div className="h-[380px] w-full lg:h-auto lg:min-h-[220px] lg:flex-1 [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart accessibilityLayer={false} margin={{ top: 24, right: 16, left: -6, bottom: 18 }}>
            {/* Grade só horizontal e bem recessiva (mesma régua da Evolução). */}
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.35} strokeDasharray="4 4" />
            <ReferenceArea
              x1={mediaPedidos}
              x2={xMax}
              y1={0}
              y2={meta}
              fill="var(--danger)"
              fillOpacity={0.08}
              stroke="color-mix(in oklab, var(--danger) 35%, transparent)"
              strokeDasharray="4 4"
              label={{
                value: `Prioridade · ${prioridade.length} ${prioridade.length === 1 ? "operador" : "operadores"}`,
                position: "insideBottomRight",
                fill: "var(--danger)",
                fontSize: 11,
                fontWeight: 700,
                offset: 10,
              }}
            />
            <XAxis
              type="number"
              dataKey="pedidos"
              name="Pedidos"
              domain={[0, xMax]}
              allowDecimals={false}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              label={{ value: "Pedidos no dia", position: "insideBottom", offset: -12, fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="tx"
              name="Taxa"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <ZAxis range={[64, 64]} />
            <ReferenceLine
              y={meta}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={(p: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                const vb = p.viewBox ?? {};
                return (
                  <EtiquetaLinha x={(vb.x ?? 0) + (vb.width ?? 0)} y={vb.y ?? 0} texto={`Meta ${meta}%`} ancora="end" />
                );
              }}
            />
            <ReferenceLine
              x={mediaPedidos}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={(p: { viewBox?: { x?: number; y?: number } }) => {
                const vb = p.viewBox ?? {};
                return (
                  <EtiquetaLinha
                    x={vb.x ?? 0}
                    y={(vb.y ?? 0) - 12}
                    texto={`Média ${mediaPedidos.toFixed(1).replace(".", ",")}`}
                    ancora="middle"
                  />
                );
              }}
            />
            {/* Sem a animação de posição do Recharts (vinha deslizando de cima):
                aparece direto no ponto, como os tooltips das tabelas. */}
            <Tooltip
              isAnimationActive={false}
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const o = payload[0].payload as PontoMapa;
                return (
                  <div className="bg-popover border-border/80 w-64 rounded-lg border p-3 font-sans shadow-md">
                    <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                      {o.supervisor}
                      {o.turno ? ` · ${TURNO_LABEL[o.turno]}` : ""}
                    </p>
                    <p className="text-foreground mt-1 text-sm font-semibold">{o.login}</p>
                    <p className="mt-0.5 text-sm">
                      <span className={`font-semibold ${classeTx(o.txRetencao, meta)}`}>{formatTx(o.txRetencao)}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {o.pedidos} pedidos<span className="mx-2">·</span>
                      {o.retidos} retidos<span className="mx-2">·</span>
                      {o.cancelados} cancelados
                    </p>
                    {o.prioridade && (
                      <p className="text-danger mt-2 text-[11px] font-semibold">Na área de prioridade</p>
                    )}
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
              // Ponto com anel na cor do fundo (separa pontos sobrepostos,
              // mesmo acabamento dos pontos da Evolução); fora da área de
              // prioridade fica esmaecido pra área se destacar.
              shape={(props: { cx?: number; cy?: number; payload?: PontoMapa }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload) return <g />;
                const ruim = abaixoDaMeta(payload.txRetencao, meta);
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.prioridade ? 5.5 : 4.5}
                    fill={ruim ? "var(--danger)" : "var(--success)"}
                    fillOpacity={payload.prioridade ? 1 : 0.55}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* -mt-1: encosta o bloco no eixo do gráfico (a margem de baixo do
          gráfico já reserva o rótulo "Pedidos no dia"). */}
      <div data-coord-prioridade className="-mt-1 shrink-0 space-y-2">
        {/* Subtítulo do bloco: nome + contagem em pílula vermelha (mesma cor
            da área de prioridade) e a ordenação em texto secundário. */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h4 className="text-foreground text-sm font-semibold">Prioridade de acompanhamento</h4>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              color: "var(--danger)",
              background: "color-mix(in oklab, var(--danger) 14%, transparent)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {prioridade.length} {prioridade.length === 1 ? "operador" : "operadores"}
          </span>
          <span className="ds-small text-muted-foreground">ordenados por quem mais cancelou</span>
        </div>
        {prioridade.length === 0 ? (
          <Vazio texto="Ninguém com volume acima da média e abaixo da meta." />
        ) : (
          // Mesma tabela (e visual) dos operadores da Tabela supervisores.
          <TabelaOperadores
            operadores={prioridade}
            meta={meta}
            onSelecionar={onSelecionar}
            mostrarSupervisor
            // ~40px por linha (célula da taxa com barra) + cabeçalho: 6 operadores
            // visíveis sem rolar, com a ponta do 7º indicando que há mais.
            alturaMaxima={300}
          />
        )}
      </div>
    </div>
  );
}

/* ───────── Concentração de cancelamentos (Pareto) ───────── */

/* ───────── Operadores sem produção ───────── */

const GRID_SEM_PRODUCAO = { gridTemplateColumns: "11rem 12rem 1fr" };

/**
 * Operadores cadastrados que não aparecem na base do dia, por supervisor.
 * Pensada pra lista cheia (ex.: no primeiro report do dia quase todo mundo
 * ainda está sem atendimento): nomes em "chips" que quebram linha alinhados à
 * esquerda (em vez de um texto corrido centralizado), supervisores com mais
 * gente parada primeiro, contagem com barra de proporção da equipe, cabeçalho
 * e linha POLO no mesmo visual da Tabela supervisores ([data-coord-tabela] /
 * [data-coord-totais] em coordenador-consolidado.css).
 */
export function SemProducao({
  operadores,
  supervisores,
}: {
  operadores: OperadorLinha[];
  supervisores: SupervisorLinha[];
}) {
  const semDado = operadores.filter((o) => o.semDado);
  // Tamanho da equipe = quem atendeu (s.operadores) + quem não apareceu na base.
  const equipeTotal = (s: SupervisorLinha) => s.operadores + s.semProducao;
  const porSupervisor = supervisores
    .map((s) => ({
      s,
      lista: semDado
        .filter((o) => o.gestorId === s.gestorId)
        .sort((a, b) => a.login.localeCompare(b.login)),
    }))
    .filter((g) => g.lista.length > 0)
    .sort((a, b) => b.lista.length - a.lista.length || a.s.nome.localeCompare(b.s.nome));
  const totalSem = porSupervisor.reduce((acc, g) => acc + g.lista.length, 0);
  const totalEquipes = supervisores.reduce((acc, s) => acc + equipeTotal(s), 0);
  const num = { fontVariantNumeric: "tabular-nums" as const };

  return (
    <div className="space-y-3">
      <SubTitulo
        titulo="Operadores sem atendimento"
        texto="Cadastrados nas equipes, mas sem nenhum atendimento na base do dia (folga, falta, afastamento ou fora da fila)."
      />
      {porSupervisor.length === 0 ? (
        <Vazio texto="Todos os operadores cadastrados atenderam hoje." />
      ) : (
        <div className="overflow-x-auto">
          <div data-coord-tabela className="min-w-[720px]">
            <Cabecalho grid={GRID_SEM_PRODUCAO} colunas={["Supervisor", "Sem atendimento", "Operadores"]} />
            {porSupervisor.map(({ s, lista }) => {
              const total = equipeTotal(s);
              const fracao = total > 0 ? lista.length / total : 0;
              return (
                <div
                  key={s.gestorId}
                  // Sem hover: a linha não é clicável.
                  className="grid items-stretch border-t border-border/40"
                  style={GRID_SEM_PRODUCAO}
                >
                  <div className="ds-body text-foreground flex min-w-0 items-center border-r border-border/30 px-3 py-2.5 font-medium">
                    <span className="truncate">{s.nome}</span>
                  </div>
                  {/* Contagem + barra da fatia da equipe que está parada. */}
                  <div className="flex min-w-0 flex-col items-center justify-center gap-1 border-r border-border/30 px-3 py-2.5" style={num}>
                    <span className="ds-mono-sm">
                      <span className="text-foreground font-semibold">{lista.length}</span>
                      <span className="text-muted-foreground"> de {total}</span>
                    </span>
                    <div aria-hidden="true" className="bg-muted/50 h-1 w-14 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(fracao * 100)}%`, background: "var(--muted-foreground)" }}
                      />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap content-center items-center gap-1.5 px-3 py-2">
                    {lista.map((o) => (
                      <span
                        key={o.email}
                        className="border-border/60 bg-muted/30 text-foreground/85 rounded-md border px-2 py-0.5 text-xs"
                      >
                        {o.login}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Linha POLO no visual da linha de totais da Tabela supervisores. */}
            <div
              data-coord-totais
              className="ds-body grid items-center gap-0 bg-muted/40 font-bold text-foreground tracking-wide uppercase"
              style={{ ...GRID_SEM_PRODUCAO, borderTop: "1px solid var(--border)" }}
            >
              <div className="min-w-0 truncate border-r border-border/50 px-3 py-2.5">Polo</div>
              <div className="min-w-0 border-r border-border/50 px-3 py-2.5 text-center" style={num}>
                {totalSem} <span className="text-muted-foreground font-normal normal-case">de {totalEquipes}</span>
              </div>
              <div className="text-muted-foreground min-w-0 px-3 py-2.5 text-xs font-normal normal-case tracking-normal">
                {Math.round((totalSem / Math.max(totalEquipes, 1)) * 100)}% do polo sem atendimento
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
