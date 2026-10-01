"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import {
  TABELA_HEADER_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho + célula genéricos pra uma coluna de indicador binário de RV
 * ("Indisp (RV)", "TMA (RV)", ...) — extraídos pra ficarem parametrizados
 * pelo slug/título, em vez de duplicar o markup a cada indicador novo.
 * A lógica de valor/cor/tooltip fica em _lib/celula-indicador-rv.ts; aqui é
 * só apresentação (título maiúsculo, nowrap, centralizado, sort).
 */

export interface IndicadorRvHeaderProps {
  titulo: string;
  /** slug sintético usado só pro sort (nunca gravado/lido do banco). */
  sortSlug: string;
  sort: { slug: string; dir: "asc" | "desc" };
  /** Presente = tabela interativa (tela); ausente = instância estática (export). */
  interativo: boolean;
  onSort?: (slug: string) => void;
  /** <SortIcon slug={sortSlug} sort={sort} /> — passado pelo caller pra não duplicar esse componente aqui. */
  sortIcon?: ReactNode;
}

export function IndicadorRvHeader({ titulo, sortSlug, sort, interativo, onSort, sortIcon }: IndicadorRvHeaderProps) {
  const ativo = sort.slug === sortSlug;
  const ariaSort = !interativo ? undefined : ativo ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  function handleKeyDown(e: KeyboardEvent<HTMLTableCellElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSort?.(sortSlug);
    }
  }

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      tabIndex={interativo ? 0 : undefined}
      onClick={interativo ? () => onSort?.(sortSlug) : undefined}
      onKeyDown={interativo ? handleKeyDown : undefined}
      className={cn(
        TABELA_HEADER_CELL_CLASS,
        "kpi-operadores-rv-header kpi-operadores-rv-col group/th relative select-none",
        interativo &&
          "hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
      )}
    >
      <div className="kpi-operadores-rv-inner">
        <span className="block overflow-hidden px-5 text-ellipsis">{titulo}</span>
      </div>
      {interativo && sortIcon}
    </th>
  );
}

export interface IndicadorRvCellProps {
  resultado: { texto: string; style: CSSProperties; title?: string; ariaLabel?: string };
}

export function IndicadorRvCell({ resultado }: IndicadorRvCellProps) {
  return (
    <td
      className={cn(TABELA_VALOR_CELL_CLASS, "kpi-operadores-rv-col whitespace-nowrap")}
      style={{ ...resultado.style, fontVariantNumeric: "tabular-nums" }}
      title={resultado.title}
      aria-label={resultado.ariaLabel}
    >
      <div className="kpi-operadores-rv-inner">{resultado.texto}</div>
    </td>
  );
}
