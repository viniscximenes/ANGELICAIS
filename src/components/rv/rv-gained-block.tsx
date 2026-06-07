"use client";

import { IconCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";

import type { RvCalculation } from "@/lib/rv/calc-types";
import { formatBRL } from "@/lib/rv/format-money";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  calculation: RvCalculation;
}

function formatValor(valor: number | null, valueSuffix = ""): string {
  if (valor === null) return "—";
  return `${valor.toFixed(1)}${valueSuffix}`;
}

export function RvGainedBlock({ calculation }: Props) {
  const linhas: Array<{ label: string; valor: number }> = [];

  for (const t of calculation.tieredResults) {
    if (t.valorGanho > 0 && t.faixaAtingida) {
      linhas.push({
        label: `${t.indicator.displayName} (${formatValor(t.valorAtual, "%")} — faixa ${t.faixaAtingida.threshold}%)`,
        valor: t.valorGanho,
      });
    }
  }

  for (const b of calculation.binaryResults) {
    if (b.atingiu && b.valorGanho > 0) {
      linhas.push({
        label: `${b.indicator.displayName} (${formatValor(b.valorAtual)})`,
        valor: b.valorGanho,
      });
    }
  }

  for (const cb of calculation.combinedBonusResults) {
    if (cb.todasAtingidas && cb.valorGanho > 0) {
      linhas.push({
        label: cb.bonus.displayName,
        valor: cb.valorGanho,
      });
    }
  }

  // Per-unit (multiplicador por retido): renderizado à parte porque tem
  // duas linhas (cabeçalho com a faixa de TX + detalhe da contagem).
  const perUnitGanhos = calculation.perUnitResults.filter(
    (pu) => pu.valorGanho > 0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="elevation-1 space-y-3 rounded-xl p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCheck
            size={18}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <h3 className="ds-h2" style={{ fontSize: "1.1rem" }}>
            O que você ganhou
          </h3>
        </div>
        <span className="ds-mono" style={{ color: "var(--success)" }}>
          {formatBRL(calculation.bruto)}
        </span>
      </div>

      {linhas.length === 0 && perUnitGanhos.length === 0 ? (
        <p className="ds-mono-sm text-muted-foreground italic">
          Nenhum indicador atingido até o momento.
        </p>
      ) : (
        <div className="space-y-2">
          {linhas.map((linha, idx) => (
            <div
              key={idx}
              className="ds-mono-sm flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">{linha.label}</span>
              <span style={{ color: "var(--success)" }}>
                {formatBRL(linha.valor)}
              </span>
            </div>
          ))}

          {perUnitGanhos.map((pu) => (
            <div
              key={pu.indicator.id}
              className="flex items-baseline justify-between gap-3"
            >
              <div className="flex flex-col">
                <span className="ds-mono-sm text-muted-foreground">
                  {pu.indicator.displayName}
                  {pu.faixaAtingida && (
                    <span>
                      {" "}
                      (TX {pu.txAtual?.toFixed(1).replace(".", ",")}% →{" "}
                      {formatBRL(pu.valorPorRetido)}/retido)
                    </span>
                  )}
                </span>
                <span className="ds-mono-sm text-muted-foreground">
                  {pu.contagemRetidos} retidos × {formatBRL(pu.valorPorRetido)}
                </span>
              </div>
              <span className="ds-mono-sm" style={{ color: "var(--success)" }}>
                {formatBRL(pu.valorGanho)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        className="mt-3 border-t pt-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="space-y-1">
          <div className="ds-mono-sm flex items-center justify-between">
            <span className="text-muted-foreground">Bruto</span>
            <span>{formatBRL(calculation.bruto)}</span>
          </div>
          <div className="ds-mono-sm flex items-center justify-between">
            <span className="text-muted-foreground">
              × {(calculation.multiplicadorPedidos * 100).toFixed(0)}% (Pedidos)
            </span>
            <span>{formatBRL(calculation.subtotal)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
