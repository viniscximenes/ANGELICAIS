"use client";

import { IconTrendingUp } from "@tabler/icons-react";
import { motion } from "framer-motion";

import type { RvCalculation } from "@/lib/rv/calc-types";
import { formatBRL } from "@/lib/rv/format-money";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  calculation: RvCalculation;
}

type Sugestao = {
  texto: string;
  valor: string;
};

export function RvPotentialBlock({ calculation }: Props) {
  const sugestoes: Sugestao[] = [];

  for (const t of calculation.tieredResults) {
    if (!t.preRequisitoAtendido) continue;

    if (t.proximaFaixa && t.valorAtual !== null) {
      const valorAtual = t.faixaAtingida?.value ?? 0;
      const diff = t.proximaFaixa.value - valorAtual;

      if (diff > 0) {
        sugestoes.push({
          texto: `Subir ${t.indicator.displayName} para ${t.proximaFaixa.threshold}% (atual ${t.valorAtual.toFixed(1)}%)`,
          valor: `+${formatBRL(diff)}`,
        });
      }
    }
  }

  for (const b of calculation.binaryResults) {
    if (!b.atingiu) {
      sugestoes.push({
        texto: `Bater ${b.indicator.displayName} (atual ${b.valorAtual !== null ? b.valorAtual.toFixed(1) : "—"})`,
        valor: `+${formatBRL(b.indicator.valueIfAchieved)}`,
      });
    }
  }

  for (const cb of calculation.combinedBonusResults) {
    if (cb.ainda_possivel && !cb.todasAtingidas) {
      sugestoes.push({
        texto: `Bater todas as condições de ${cb.bonus.displayName}`,
        valor: `+${formatBRL(cb.bonus.valueIfAllAchieved)}`,
      });
    }
  }

  if (calculation.multiplicadorPedidos < 1 && calculation.multiplicadorPedidos > 0) {
    const faltam = Math.round((1 - calculation.multiplicadorPedidos) * 100);
    sugestoes.push({
      texto: `Bater 100% dos Pedidos (atual ${Math.round(calculation.multiplicadorPedidos * 100)}%)`,
      valor: `+${faltam}% no subtotal`,
    });
  }

  if (sugestoes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-1 space-y-3 rounded-xl p-5"
    >
      <div className="flex items-center gap-2">
        <IconTrendingUp
          size={18}
          className="text-muted-foreground"
          aria-hidden="true"
        />
        <h3 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          O que você ainda pode ganhar
        </h3>
      </div>

      <div className="space-y-2">
        {sugestoes.map((s, idx) => (
          <div
            key={idx}
            className="ds-mono-sm flex items-center justify-between gap-3"
          >
            <span className="text-muted-foreground">{s.texto}</span>
            <span className="text-muted-foreground">{s.valor}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
