"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MatrizResult } from "@/lib/retencao/get-matriz-volume-taxa";

interface GraficoMatrizProps {
  matriz: MatrizResult;
}

export function GraficoMatriz({ matriz }: GraficoMatrizProps) {
  const { items, medianaVolume, medianaTx } = matriz;

  // Normaliza taxas para a escala de 0 a 100% para visualização no gráfico
  const scatterData = items.map((item) => ({
    ...item,
    txPercent: item.tx !== null ? parseFloat((item.tx * 100).toFixed(1)) : 0,
  }));

  const maxVolume = Math.max(...scatterData.map((d) => d.total), 10);
  const xDomain = [0, Math.ceil(maxVolume * 1.15)];

  const medianaTxPercent = parseFloat((medianaTx * 100).toFixed(1));

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4 flex flex-col justify-between">
      <div className="space-y-1">
        <h3 className="ds-h3 font-semibold text-foreground">Matriz de Temas (Volume × Taxa)</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Identifique temas que mais perdem clientes no quadrante <strong className="text-danger">Urgente</strong> (Alto Volume, Baixa Taxa).
        </p>
      </div>

      <div className="w-full h-[260px] pt-4 font-sans text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} />
            
            <XAxis
              type="number"
              dataKey="total"
              name="Volume"
              domain={xDomain}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            
            <YAxis
              type="number"
              dataKey="txPercent"
              name="Taxa de Retenção"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />

            {/* Custom Tooltip */}
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const info = payload[0].payload as typeof scatterData[0];
                return (
                  <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl space-y-1 font-sans">
                    <p className="text-[11px] font-bold text-foreground truncate max-w-[200px]">
                      {info.motivo}
                    </p>
                    <div className="h-px bg-white/10 my-1" />
                    <p className="text-[11px] text-muted-foreground">
                      Volume: <strong className="text-foreground">{info.total}</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Retenção: <strong className="text-foreground">{info.txPercent}%</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Cancelados: <strong className="text-danger">{info.cancelados}</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Quadrante:{" "}
                      <span
                        className={[
                          "font-semibold capitalize text-[10px] px-1 rounded",
                          info.quadrante === "urgente" ? "text-danger bg-danger/10" : "text-success bg-success/10",
                        ].join(" ")}
                      >
                        {info.quadrante}
                      </span>
                    </p>
                  </div>
                );
              }}
            />

            {/* Linha vertical de corte do volume (mediana) */}
            {medianaVolume > 0 && (
              <ReferenceLine
                x={medianaVolume}
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray="4 4"
                label={{
                  value: `Mediana Vol: ${medianaVolume}`,
                  position: "top",
                  fill: "var(--muted-foreground)",
                  fontSize: 9,
                }}
              />
            )}

            {/* Linha horizontal de corte da taxa (mediana) */}
            {medianaTxPercent > 0 && (
              <ReferenceLine
                y={medianaTxPercent}
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray="4 4"
                label={{
                  value: `Mediana TX: ${medianaTxPercent.toFixed(0)}%`,
                  position: "insideBottomLeft",
                  fill: "var(--muted-foreground)",
                  fontSize: 9,
                }}
              />
            )}

            {/* Renderização dos Pontos de Motivo */}
            <Scatter
              name="Motivos"
              data={scatterData}
              fill="var(--primary)"
              shape={(props: { cx?: number; cy?: number; payload?: { quadrante: string } }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload) return null;
                // Cores dinâmicas por quadrante
                let color = "var(--primary)";
                if (payload.quadrante === "urgente") {
                  color = "var(--danger)";
                } else if (payload.quadrante === "alerta") {
                  color = "var(--warning)";
                } else if (payload.quadrante === "estavel") {
                  color = "var(--success)";
                } else {
                  color = "var(--muted-foreground)";
                }

                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.quadrante === "urgente" ? 8 : 6}
                    fill={color}
                    stroke="var(--background)"
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
