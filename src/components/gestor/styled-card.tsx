import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CardCorners = "all" | "left" | "right" | "none";

/** Marcas nos vértices do card, na cor primária — identidade visual do painel do gestor. */
function CardDecorator({ corners = "all" }: { corners?: CardCorners }) {
  if (corners === "none") return null;

  const showLeft = corners === "all" || corners === "left";
  const showRight = corners === "all" || corners === "right";

  return (
    <>
      {showLeft && (
        <span
          aria-hidden="true"
          className="border-primary absolute top-0 left-0 block size-2.5 border-t-2 border-l-2 pointer-events-none z-10 !m-0"
        />
      )}
      {showRight && (
        <span
          aria-hidden="true"
          className="border-primary absolute top-0 right-0 block size-2.5 border-t-2 border-r-2 pointer-events-none z-10 !m-0"
        />
      )}
      {showLeft && (
        <span
          aria-hidden="true"
          className="border-primary absolute bottom-0 left-0 block size-2.5 border-b-2 border-l-2 pointer-events-none z-10 !m-0"
        />
      )}
      {showRight && (
        <span
          aria-hidden="true"
          className="border-primary absolute bottom-0 right-0 block size-2.5 border-b-2 border-r-2 pointer-events-none z-10 !m-0"
        />
      )}
    </>
  );
}

export interface StyledCardProps {
  children: ReactNode;
  className?: string;
  /**
   * Gradiente radial sutil atrás do conteúdo (tabelas/gráficos) — usa
   * `--muted`/`--background`, então acompanha o tema (dark/light) sem
   * precisar de override específico.
   */
  withGradient?: boolean;
  /**
   * Posição das cantoneiras azuis nos vértices.
   * - `all`: todos os 4 vértices (padrão)
   * - `left`: apenas vértices da esquerda (top-left & bottom-left)
   * - `right`: apenas vértices da direita (top-right & bottom-right)
   * - `none`: nenhuma cantoneira
   */
  corners?: CardCorners;
}

/**
 * Card com cantos marcados + bordas retas, usado só no painel do gestor
 * (`/gestor/d-1`). Não reaproveitar em páginas do operador — é uma variante
 * visual própria deste painel, por cima do `Card` (shadcn) compartilhado.
 */
export function StyledCard({
  children,
  className,
  withGradient = true,
  corners = "all",
}: StyledCardProps) {
  return (
    <Card
      className={cn(
        "group relative gap-0 rounded-none bg-transparent p-6 shadow-zinc-950/5 overflow-visible border border-border/80 ring-0",
        className,
      )}
      style={
        withGradient
          ? {
              backgroundColor: "color-mix(in srgb, var(--background) 70%, var(--card) 30%)",
              backgroundImage:
                "radial-gradient(125% 125% at 50% 0%, color-mix(in srgb, var(--background) 60%, var(--card) 40%), color-mix(in srgb, var(--background) 85%, var(--card) 15%))",
            }
          : undefined
      }
    >
      <CardDecorator corners={corners} />
      {children}
    </Card>
  );
}
