"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  GestorMotivosConsolidados,
  GestorOperadorLinha,
  TxPorMotivo,
} from "@/lib/google/gestor";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Metas adaptáveis por tema
const METAS: Record<keyof TxPorMotivo, number> = {
  financeiro: 0.8, // Financeiro: 80%
  insatisfacaoServico: 0.65, // Ins. Serviço: 65%
  insatisfacaoAtendimento: 0.65, // Ins. Atendimento: 65%
  mudancaEndereco: 0.6, // Mud. Endereço: 60%
  mudancaProvedora: 0.6, // Mud. Provedora: 60%
  outros: 0.6, // Outros: 60%
};

const TX_MOTIVOS: Array<{ key: keyof TxPorMotivo; label: string }> = [
  { key: "financeiro", label: "Financeiro" },
  { key: "mudancaEndereco", label: "Mud. Endereço" },
  { key: "insatisfacaoServico", label: "Ins. Serviço" },
  { key: "insatisfacaoAtendimento", label: "Ins. Atendimento" },
  { key: "mudancaProvedora", label: "Mud. Provedora" },
  { key: "outros", label: "Outros" },
];

interface GestorMotivosSectionProps {
  txPorMotivo: TxPorMotivo;
  operadores: GestorOperadorLinha[];
}

// Helper para obter e ordenar a lista de operadores deflatores para um determinado tema
function getDeflators(
  operadores: GestorOperadorLinha[],
  key: keyof TxPorMotivo,
  meta: number
) {
  const list: Array<{ name: string; tx: number; retidos: number; cancelados: number }> = [];

  for (const op of operadores) {
    const r = op.motivosRetidos[key as keyof typeof op.motivosRetidos] ?? 0;
    const c = op.motivosCancelados[key as keyof typeof op.motivosCancelados] ?? 0;
    const total = r + c;
    if (total > 0) {
      const tx = r / total;
      if (tx < meta) {
        list.push({
          name: deriveNomeOperador(op.nome),
          tx,
          retidos: r,
          cancelados: c,
        });
      }
    }
  }

  // Ordena por maior quantidade de cancelados e depois por menor taxa
  return list.sort((a, b) => b.cancelados - a.cancelados || a.tx - b.tx);
}

export function GestorMotivosSection({
  txPorMotivo,
  operadores,
}: GestorMotivosSectionProps) {
  // Prepara dados para o gráfico de taxa de retenção por motivo
  const chartData = TX_MOTIVOS.map(({ key, label }) => {
    const tx = txPorMotivo[key];
    const meta = METAS[key];
    return {
      motivo: label,
      taxa: tx !== null ? tx * 100 : 0,
      meta: meta * 100,
      txRaw: tx,
      metaRaw: meta,
      metaFormatted: `${(meta * 100).toFixed(0)}%`,
      formatted: tx !== null ? `${(tx * 100).toFixed(1)}%` : "—",
      key,
    };
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">02</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Retenção por Tema</h2>
        </div>
      </div>

      {/* Gráfico principal focado na Taxa de Retenção por Motivo */}
      <div className="elevation-1 rounded-lg p-6">
        <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 12, left: -20, bottom: 5 }}
            >
              <XAxis
                dataKey="motivo"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                stroke="var(--border)"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                cursor={{ fill: "var(--elevation-2-bg)", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  const cor =
                    item.txRaw === null
                      ? "var(--muted-foreground)"
                      : item.txRaw >= item.metaRaw
                        ? "var(--success)"
                        : "var(--danger)";

                  const deflators = getDeflators(operadores, item.key, item.metaRaw);

                  return (
                    <div
                      className="ds-small rounded-md px-3 py-2"
                      style={{
                        background: "var(--elevation-3-bg)",
                        border: "1px solid var(--elevation-3-border)",
                        color: "var(--foreground)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        minWidth: "220px",
                        maxWidth: "320px",
                      }}
                    >
                      <div className="ds-mono-sm text-muted-foreground mb-1 font-bold">
                        {item.motivo}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Retenção:</span>
                        <span className="ds-mono font-bold text-sm" style={{ color: cor }}>
                          {item.formatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 mt-0.5 border-b border-border/20 pb-1 mb-1">
                        <span className="text-muted-foreground">Meta:</span>
                        <span className="ds-mono font-medium text-muted-foreground text-xs">
                          {item.metaFormatted}
                        </span>
                      </div>

                      {deflators.length > 0 ? (
                        <div className="mt-1.5 space-y-1">
                          <div className="text-[10px] font-bold text-danger uppercase tracking-wider">
                            Deflatores (&lt; {item.metaFormatted}):
                          </div>
                          <div className="space-y-0.5">
                            {deflators.map((d, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] gap-4">
                                <span className="text-foreground truncate font-mono text-[10.5px]">{d.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="ds-mono text-danger font-medium text-[10.5px]">
                                    {(d.tx * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-sans font-normal">(</span>
                                  <span className="text-[10.5px] font-bold" style={{ color: "var(--success)" }}>
                                    {d.retidos}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-sans">/</span>
                                  <span className="text-[10.5px] font-bold" style={{ color: "var(--danger)" }}>
                                    {d.cancelados}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-sans font-normal">)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-success uppercase tracking-wider mt-1.5">
                          Sem deflatores neste tema
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {/* Barra das taxas reais (única série de barras, grossas e centralizadas por padrão) */}
              <Bar
                dataKey="taxa"
                radius={[6, 6, 0, 0]}
                animationDuration={500}
                animationEasing="ease-out"
              >
                {chartData.map((item, idx) => {
                  const fill =
                    item.txRaw === null
                      ? "var(--muted-foreground)"
                      : item.txRaw >= item.metaRaw
                        ? "var(--success)"
                        : "var(--danger)";
                  return <Cell key={idx} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.section>
  );
}
