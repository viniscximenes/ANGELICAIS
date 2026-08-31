"use client";

import type { ReactNode } from "react";
import { IconChevronDown, IconChevronRight, IconLoader2 } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import type { IndicadoresGestor } from "@/lib/retencao/comparativo/get-gestores-comparativo";

interface LinhaGestorComparativoProps {
  indicadores: Pick<
    IndicadoresGestor,
    "nome" | "tx" | "pedidos" | "retidos" | "cancelados"
  >;
  /** Meta de tx (0-100) para colorir a taxa. */
  meta: number;
  /** Realça a linha do gestor logado. */
  destaque?: boolean;
  aberto: boolean;
  carregando: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

type Celula = { label: string; valor: string; classe?: string };

export function LinhaGestorComparativo({
  indicadores,
  meta,
  destaque = false,
  aberto,
  carregando,
  onToggle,
  children,
}: LinhaGestorComparativoProps) {
  const { nome, tx, pedidos, retidos, cancelados } = indicadores;

  const txClasse =
    tx === null
      ? "text-muted-foreground"
      : tx < meta / 100
        ? "text-danger"
        : "text-success";

  const celulas: Celula[] = [
    {
      label: "Taxa de Retenção",
      valor: tx !== null ? `${(tx * 100).toFixed(1)}%` : "—",
      classe: txClasse,
    },
    { label: "Total de Pedidos", valor: pedidos.toLocaleString("pt-BR") },
    { label: "Clientes Retidos", valor: retidos.toLocaleString("pt-BR") },
    { label: "Clientes Cancelados", valor: cancelados.toLocaleString("pt-BR") },
  ];

  return (
    <StyledCard
      className={`p-0 overflow-hidden ${destaque ? "ring-1 ring-primary" : ""}`}
      withGradient
      corners="all"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="grid w-full items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left hover:bg-muted/10 transition-colors grid-cols-[auto_minmax(0,14rem)_repeat(4,minmax(0,1fr))]"
      >
        <span className="text-muted-foreground/60">
          {carregando ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : aberto ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </span>

        <span className="flex min-w-0 flex-col">
          <span className="ds-body text-foreground text-sm font-semibold truncate">
            {nome}
          </span>
          {destaque && (
            <span className="ds-mono-sm text-primary text-[10px] uppercase tracking-wider">
              Você
            </span>
          )}
        </span>

        {celulas.map((c) => (
          <span key={c.label} className="flex min-w-0 flex-col">
            <span className="ds-small text-muted-foreground/80 text-[10px] font-semibold uppercase tracking-wider">
              {c.label}
            </span>
            <span
              className={`ds-body text-sm font-semibold ${c.classe ?? "text-foreground"}`}
            >
              {c.valor}
            </span>
          </span>
        ))}
      </button>

      {aberto && children && (
        <div className="border-t border-border/40 px-4 py-5 space-y-6">{children}</div>
      )}
    </StyledCard>
  );
}
