"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export interface SegmentedControlItem {
  value: string;
  /** Texto/nó visível no item. */
  label: ReactNode;
  /** Rótulo acessível completo, se diferente do texto visível (ex.: "setembro de 2026" pro item "Set"). */
  ariaLabel?: string;
}

interface SegmentedControlProps {
  items: SegmentedControlItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  /** id do indicador deslizante (motion `layoutId`) — único por instância na página, pra cada controle animar só o próprio indicador (não brigar com o de outro). */
  layoutId: string;
  /** value do item mostrando um pulso de "carregando" (sem deslocar layout). */
  loadingValue?: string | null;
  className?: string;
}

/**
 * Controle segmentado genérico — extraído do antigo MesSelector pra ser
 * reaproveitado também pelo seletor de modo do RV (mesmo container,
 * indicador deslizante, cores, fonte, altura e acessibilidade; só o
 * `layoutId` muda entre instâncias).
 */
export function SegmentedControl({
  items,
  value,
  onChange,
  ariaLabel,
  layoutId,
  loadingValue = null,
  className,
}: SegmentedControlProps) {
  const reduceMotion = useReducedMotion();
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Respeita .theme-transitioning (globals.css) — a troca dark/light já
  // mata toda `transition` CSS enquanto essa classe está no <html>; como o
  // indicador desliza via transform (motion, não CSS transition), replicamos
  // a mesma intenção aqui: sem "spring" nesse instante, pra não brigar com o
  // fade de tema.
  const [temaTransicionando, setTemaTransicionando] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const check = () => setTemaTransicionando(html.classList.contains("theme-transitioning"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const semAnimacao = reduceMotion || temaTransicionando;

  const focarIndice = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (item) itemRefs.current[item.value]?.focus();
    },
    [items],
  );

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (items.length === 0) return;
    let novoIdx: number | null = null;
    if (e.key === "ArrowRight") novoIdx = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") novoIdx = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") novoIdx = 0;
    else if (e.key === "End") novoIdx = items.length - 1;

    if (novoIdx !== null) {
      e.preventDefault();
      onChange(items[novoIdx].value);
      focarIndice(novoIdx);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] p-1 scrollbar-tema",
        className,
      )}
    >
      {items.map((item, idx) => {
        const ativo = item.value === value;
        const carregando = loadingValue === item.value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              itemRefs.current[item.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={item.ariaLabel}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "font-sans relative z-0 inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-[calc(var(--radius)-2px)] px-3 text-sm whitespace-nowrap outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
              ativo
                ? "font-semibold text-[var(--seg-text-active)]"
                : "font-medium text-[var(--seg-text)] hover:text-[var(--seg-text-active)]",
            )}
          >
            {ativo && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-[calc(var(--radius)-2px)] border border-[var(--seg-thumb-border)] bg-[var(--seg-thumb)]"
                style={{ boxShadow: "var(--kpi-shadow)" }}
                transition={semAnimacao ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <span className={cn("inline-block", carregando && "animate-pulse")}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
