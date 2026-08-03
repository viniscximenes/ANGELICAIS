import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Marcas nos 4 vértices do card, na cor primária — identidade visual do painel do gestor. */
function CardDecorator() {
  return (
    <>
      <span
        aria-hidden="true"
        className="border-primary absolute -top-px -left-px block size-2 border-t-2 border-l-2"
      />
      <span
        aria-hidden="true"
        className="border-primary absolute -top-px -right-px block size-2 border-t-2 border-r-2"
      />
      <span
        aria-hidden="true"
        className="border-primary absolute -bottom-px -left-px block size-2 border-b-2 border-l-2"
      />
      <span
        aria-hidden="true"
        className="border-primary absolute -bottom-px -right-px block size-2 border-b-2 border-r-2"
      />
    </>
  );
}

interface StyledCardProps {
  children: ReactNode;
  className?: string;
  /**
   * Gradiente radial sutil atrás do conteúdo (tabelas/gráficos) — usa
   * `--muted`/`--background`, então acompanha o tema (dark/light) sem
   * precisar de override específico.
   */
  withGradient?: boolean;
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
}: StyledCardProps) {
  return (
    <Card
      className={cn(
        "group relative gap-0 rounded-none bg-transparent p-6 shadow-zinc-950/5",
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
      <CardDecorator />
      {children}
    </Card>
  );
}
