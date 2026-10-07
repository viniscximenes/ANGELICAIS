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
  tamanho = "padrao",
}: {
  ariaLabel: string;
  /** Id único do grupo — separa a animação do destaque entre os dois toggles. */
  grupo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  /**
   * "grande": 36px de altura, texto 14px semibold e mais respiro — mais
   * presença nos cards do Analítico (36px = altura única dos controles do
   * Analítico; o topo da página segue com 32px). Default "padrao" =
   * os 32px compactos de sempre (demais usos não mudam).
   */
  tamanho?: "padrao" | "grande";
}) {
  const grande = tamanho === "grande";
  // Padrão radiogroup (WAI-ARIA): só a opção marcada entra no Tab; setas
  // escolhem e focam a vizinha (com volta circular). useSetasRolagem ignora
  // setas dentro de [role="radiogroup"], então elas não rolam a página.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const passo =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (passo === 0 || opcoes.length === 0) return;
    e.preventDefault();
    const atual = Math.max(0, opcoes.findIndex((op) => op.valor === valor));
    const proximo = (atual + passo + opcoes.length) % opcoes.length;
    onChange(opcoes[proximo].valor);
    const botoes = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    botoes[proximo]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-0.5 rounded-md border border-[var(--seg-track-border)] bg-[var(--seg-track)] ${grande ? "h-9 p-0.5" : "h-8 p-0.5"}`}
    >
      {opcoes.map((op) => {
        const ativo = op.valor === valor;
        return (
          <button
            key={String(op.valor)}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(op.valor)}
            className={`relative h-full cursor-pointer rounded-[var(--seg-thumb-radius,5px)] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              grande ? "min-w-12 px-4 text-sm font-semibold" : "min-w-10 px-3 text-xs font-medium"
            } ${
              ativo ? "text-[var(--seg-text-active)]" : "text-[var(--seg-text)] hover:text-foreground"
            }`}
          >
            {ativo && (
              <motion.span
                layoutId={`${grupo}-destaque`}
                aria-hidden="true"
                className="absolute inset-0 rounded-[var(--seg-thumb-radius,5px)] bg-[var(--seg-thumb)] shadow-sm"
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
