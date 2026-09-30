"use client";

import { motion } from "motion/react";

/**
 * Toggle segmentado dos cards do Analítico (/s/reports/consolidado):
 * Divisor de Quartil (Equipe/Polo, Q1–Q4) e Desempenho por marca e
 * unidade (Marca/Unidade). Mesmos tokens do
 * SegmentedControl de /kpi/operadores (--seg-track/--seg-thumb/--seg-text),
 * mas mais compacto: 32px de altura no total (igual aos demais controles da
 * página — engrenagem, "Copiar imagem", switches), texto medium em vez de
 * bold e o destaque DESLIZANDO entre as opções (motion layoutId) em vez de
 * trocar de lugar seco.
 */
export function Segmentado<T extends string | number>({
  ariaLabel,
  grupo,
  opcoes,
  valor,
  onChange,
}: {
  ariaLabel: string;
  /** Id único do grupo — separa a animação do destaque entre os dois toggles. */
  grupo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex h-8 items-center gap-0.5 rounded-md border border-[var(--seg-track-border)] bg-[var(--seg-track)] p-0.5"
    >
      {opcoes.map((op) => {
        const ativo = op.valor === valor;
        return (
          <button
            key={String(op.valor)}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(op.valor)}
            className={`relative h-full min-w-10 cursor-pointer rounded-[5px] px-3 text-xs font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              ativo ? "text-[var(--seg-text-active)]" : "text-[var(--seg-text)] hover:text-foreground"
            }`}
          >
            {ativo && (
              <motion.span
                layoutId={`${grupo}-destaque`}
                aria-hidden="true"
                className="absolute inset-0 rounded-[5px] bg-[var(--seg-thumb)] shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{op.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
