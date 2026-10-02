"use client";

import type { ReactNode } from "react";
import { IconChevronDown, IconChevronRight, IconLoader2 } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import type { SupervisorQuartilResumo } from "@/lib/retencao/quartil-operacao/actions";

interface LinhaSupervisorQuartilProps {
  resumo: SupervisorQuartilResumo;
  /** Meta de tx (0-100) para colorir a taxa. */
  meta: number;
  aberto: boolean;
  carregando: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

type Celula = { label: string; valor: string; classe?: string };

/**
 * Linha de supervisor — mesmo StyledCard, grid, tipografia e toggle de
 * LinhaGestorComparativo (/s/operacao/comparativo), com a coluna extra
 * "Operadores em Q4" na frente dos 4 indicadores da equipe.
 */
export function LinhaSupervisorQuartil({
  resumo,
  meta,
  aberto,
  carregando,
  onToggle,
  children,
}: LinhaSupervisorQuartilProps) {
  const { nome, username, qtdOperadoresQ4, tx, pedidos, retidos, cancelados } = resumo;

  // Nome de exibição a partir do user ("ana.angelica" → "Ana Angelica"),
  // mesma regra do comparativo. Sem username, mantém o nome completo.
  const usuario = username?.split("@")[0]?.trim();
  const nomeCurto = usuario ? formatNomeProprio(usuario.replace(/[._-]+/g, " ")) : nome;

  const txClasse =
    tx === null
      ? "text-muted-foreground"
      : tx < meta / 100
        ? "text-danger"
        : "text-success";

  const celulas: Celula[] = [
    {
      label: "Operadores em Q4",
      valor: qtdOperadoresQ4.toLocaleString("pt-BR"),
      classe: qtdOperadoresQ4 > 0 ? "text-danger" : "text-muted-foreground",
    },
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
    <StyledCard className="p-0 overflow-hidden" withGradient corners="all">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="grid w-full items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left hover:bg-muted/10 transition-colors grid-cols-[auto_minmax(0,14rem)_repeat(5,minmax(0,1fr))]"
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
            {nomeCurto}
          </span>
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
