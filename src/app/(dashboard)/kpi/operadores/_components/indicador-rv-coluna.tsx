"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

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
        "font-sans px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none",
        ativo ? "text-foreground" : "text-muted-foreground",
        interativo &&
          "hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
      )}
    >
      {titulo}
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
      className="font-sans px-3 py-2 text-center whitespace-nowrap"
      style={{ ...resultado.style, fontVariantNumeric: "tabular-nums" }}
      title={resultado.title}
      aria-label={resultado.ariaLabel}
    >
      {resultado.texto}
    </td>
  );
}
