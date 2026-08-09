"use client";

import {
  ComposedChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StyledCard } from "@/components/gestor/styled-card";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";

interface Props {
  operador: OperadorIndividual | null;
  nomeExibido: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: number;
  /** Quartil do operador nos dois escopos. null quando indisponível. */
  quartil?: QuartilOperador | null;
}

function formatTx(tx: number | null): string {
  return tx !== null ? `${(tx * 100).toFixed(1)}%` : "—";
}

export function OperadorDetalheDialog({
  operador,
  nomeExibido,
  open,
  onOpenChange,
  meta = 65,
  quartil = null,
}: Props) {
  if (!operador) return null;

  const resumo = [
    { label: "TX Retenção", valor: formatTx(operador.tx) },
    { label: "Total Pedidos", valor: operador.total.toLocaleString("pt-BR") },
    { label: "Clientes Retidos", valor: operador.retidos.toLocaleString("pt-BR") },
    { label: "Clientes Cancelados", valor: operador.cancelados.toLocaleString("pt-BR") },
  ];

  const chartData = operador.porHora.map((d) => ({
    ...d,
    txDisplay: d.tx !== null ? parseFloat((d.tx * 100).toFixed(1)) : null,
  }));

  const validTxValues = chartData.map((d) => d.txDisplay).filter((v): v is number => v !== null);
  const dataMax = validTxValues.length > 0 ? Math.max(...validTxValues) : 100;
  const dataMin = validTxValues.length > 0 ? Math.min(...validTxValues) : 0;

  let gradientOffset = 0;
  if (dataMax <= meta) {
    gradientOffset = 0;
  } else if (dataMin >= meta) {
    gradientOffset = 1;
  } else {
    gradientOffset = (dataMax - meta) / (dataMax - dataMin);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-4xl bg-background border-border/80 p-6 shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="border-b border-dashed border-border/60 pb-3 space-y-1.5">
          <DialogTitle className="ds-h3 text-foreground font-semibold tracking-tight text-xl">
            {nomeExibido}
          </DialogTitle>
          {quartil && (quartil.equipe.quartil || quartil.empresa.quartil) && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {quartil.equipe.quartil && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-mono text-muted-foreground">
                  <span>Quartil Equipe:</span>
                  <strong className="font-semibold text-foreground">{quartil.equipe.quartil}</strong>
                  <span className="text-muted-foreground/70">({quartil.equipe.rank}/{quartil.equipe.totalOperadores})</span>
                </div>
              )}
              {quartil.empresa.quartil && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-mono text-muted-foreground">
                  <span>Quartil Empresa:</span>
                  <strong className="font-semibold text-foreground">{quartil.empresa.quartil}</strong>
                  <span className="text-muted-foreground/70">({quartil.empresa.rank}/{quartil.empresa.totalOperadores})</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ── Resumo ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumo.map((c, idx) => {
              const corners =
                idx === 0 ? "left" : idx === resumo.length - 1 ? "right" : "none";

              const metaFracao = meta / 100;
              const abaixo = operador.tx === null || operador.tx < metaFracao;
              const valueColorClass = idx === 0 ? (abaixo ? "text-danger" : "text-success") : "text-foreground";

              return (
                <StyledCard
                  key={c.label}
                  className="px-4 py-3.5 flex flex-col justify-center"
                  withGradient
                  corners={corners}
                >
                  <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                    {c.label}
                  </p>
                  <p className={`ds-display text-2xl font-semibold tabular-nums ${valueColorClass}`}>
                    {c.valor}
                  </p>
                </StyledCard>
              );
            })}
          </div>

          {/* ── Evolução por hora ──────────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Evolução por Hora
            </h4>
            <StyledCard className="p-4" withGradient>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="txLineGradOperador" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={0} stopColor="var(--success)" />
                        <stop offset={gradientOffset} stopColor="var(--success)" />
                        <stop offset={gradientOffset} stopColor="var(--danger)" />
                        <stop offset={1} stopColor="var(--danger)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeOpacity={0.4}
                      strokeDasharray="4 4"
                    />
                    
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    />
                    
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10, opacity: 0.5 }}
                    />

                    {/* Custom Tooltip */}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const info = payload[0].payload as typeof chartData[0];
                        return (
                          <div className="bg-popover border border-border/80 rounded-lg p-3 shadow-md space-y-1.5 font-sans">
                            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                              Hora: {info.label}
                            </p>
                            <div className="h-px bg-border/60 my-1" />
                            <p className="text-xs text-muted-foreground">
                              Retenção:{" "}
                              <strong className={info.txDisplay !== null && info.txDisplay < meta ? "text-danger" : "text-success"}>
                                {info.txDisplay !== null ? `${info.txDisplay}%` : "—"}
                              </strong>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Pedidos: <strong className="text-foreground">{info.total}</strong>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Retidos: <strong className="text-foreground">{info.retidos}</strong>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cancelados: <strong className="text-foreground">{info.cancelados}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />

                    {/* Fundo do Volume (Barras) */}
                    <Bar
                      yAxisId="right"
                      dataKey="total"
                      barSize={24}
                      radius={[4, 4, 0, 0]}
                      animationDuration={300}
                      animationEasing="ease-out"
                    >
                      {chartData.map((entry, index) => {
                        const isBelow = entry.txDisplay !== null && entry.txDisplay < meta;
                        const cellColor = isBelow ? "var(--danger)" : "var(--success)";
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={cellColor}
                            opacity={0.15}
                          />
                        );
                      })}
                    </Bar>

                    {/* Referência da Meta */}
                    <ReferenceLine
                      yAxisId="left"
                      y={meta}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      strokeOpacity={0.8}
                      label={{
                        value: `Meta: ${meta.toFixed(0)}%`,
                        position: "insideBottomLeft",
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                        offset: 5,
                      }}
                    />

                    {/* Linha da Retenção */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="txDisplay"
                      stroke="url(#txLineGradOperador)"
                      strokeWidth={2.5}
                      animationDuration={350}
                      animationEasing="ease-out"
                      dot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                        const { cx, cy, payload } = props;
                        if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                        const isBelow = payload.txDisplay < meta;
                        const dotColor = isBelow ? "var(--danger)" : "var(--success)";
                        return (
                          <circle
                            key={`dot-${payload.label}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            stroke="var(--background)"
                            strokeWidth={2}
                            fill={dotColor}
                          />
                        );
                      }}
                      activeDot={(props: { cx?: number; cy?: number; payload?: { txDisplay: number | null; label: string } }) => {
                        const { cx, cy, payload } = props;
                        if (!cx || !cy || payload?.txDisplay === null || payload?.txDisplay === undefined) return null;
                        const isBelow = payload.txDisplay < meta;
                        const dotColor = isBelow ? "var(--danger)" : "var(--success)";
                        return (
                          <circle
                            key={`active-dot-${payload.label}`}
                            cx={cx}
                            cy={cy}
                            r={6}
                            stroke="var(--background)"
                            strokeWidth={2}
                            fill={dotColor}
                          />
                        );
                      }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </StyledCard>
          </div>

          {/* ── Retenção por tema ──────────────────────────────── */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Retenção por Tema
            </h4>
            <StyledCard className="p-0 overflow-hidden" withGradient>
              {operador.porMotivo.length === 0 ? (
                <p className="ds-small text-muted-foreground p-6 text-center text-xs">
                  Nenhum atendimento registrado para este operador no dia.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="ds-mono-sm text-muted-foreground border-border/40 border-b text-[11px] tracking-wider uppercase">
                        <th className="px-4 py-2.5 font-semibold">Motivo</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Retidos</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Cancelados</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Pedidos</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Taxa de Retenção</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operador.porMotivo.map((m) => (
                        <tr
                          key={m.motivo}
                          className="border-border/20 hover:bg-muted/10 border-b transition-colors last:border-0"
                        >
                          <td className="text-foreground max-w-[220px] truncate px-4 py-2.5 text-xs font-medium">
                            {m.motivo}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {m.retidos}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {m.cancelados}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-center font-mono text-xs">
                            {m.total}
                          </td>
                          <td className="text-foreground px-4 py-2.5 text-center font-mono text-xs font-semibold">
                            {formatTx(m.tx)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </StyledCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
