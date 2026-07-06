"use client";

import { motion } from "framer-motion";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface VisaoGeralCardsProps {
  data: VisaoGeralData;
  meta: number; // Meta de 0 a 100
}

export function VisaoGeralCards({ data, meta }: VisaoGeralCardsProps) {
  const { total, retidos, cancelados, tx } = data;

  const formattedTx = tx !== null ? `${(tx * 100).toFixed(1)}%` : "—";
  
  const metaFracao = meta / 100;
  const isBelowMeta = tx !== null && tx < metaFracao;
  const txColor = "var(--foreground)";
  const txIndicatorColor = isBelowMeta ? "var(--danger)" : "var(--primary)";

  const cardItems = [
    {
      id: "tx_retencao",
      label: "Taxa de Retenção",
      value: formattedTx,
      highlight: true,
      color: txColor,
      indicatorColor: txIndicatorColor,
    },
    {
      id: "total_atendimentos",
      label: "Total de pedidos",
      value: total.toLocaleString("pt-BR"),
      highlight: true,
      color: "var(--foreground)",
      indicatorColor: "var(--warning)", // Amarelo
    },
    {
      id: "retidos",
      label: "Clientes Retidos",
      value: retidos.toLocaleString("pt-BR"),
      highlight: true,
      color: "var(--foreground)",
      indicatorColor: "var(--success)",
    },
    {
      id: "cancelados",
      label: "Clientes Cancelados",
      value: cancelados.toLocaleString("pt-BR"),
      highlight: true,
      color: "var(--foreground)",
      indicatorColor: "var(--danger)",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardItems.map((card, idx) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.05 + idx * 0.03,
            duration: 0.25,
            ease: EASE_OUT_EXPO,
          }}
          className={[
            "relative overflow-hidden rounded-lg p-5 flex flex-col justify-between min-h-[120px]",
            card.highlight
              ? "bg-zinc-800/60 border border-white/15 shadow-lg shadow-black/20"
              : "bg-zinc-800/40 border border-white/10",
          ].join(" ")}
          style={{
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Indicador lateral */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{
              backgroundColor: card.indicatorColor,
            }}
          />

          <div>
            <p className="ds-small text-muted-foreground uppercase tracking-wider text-[11px] mb-1.5 font-medium">
              {card.label}
            </p>
            <p
              className="ds-display font-semibold"
              style={{
                fontSize: card.highlight ? "2.25rem" : "1.875rem",
                color: card.color,
              }}
            >
              {card.value}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
