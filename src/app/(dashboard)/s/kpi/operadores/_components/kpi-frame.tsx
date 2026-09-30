import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Fork local de StyledCard (src/components/gestor/styled-card.tsx) — pedido
 * explícito: a tabela desta rota deve manter SÓ as cantoneiras (a marca
 * visual dos 4 vértices), sem a borda/fundo/raio que o `Card` (shadcn) por
 * baixo do StyledCard adiciona. Não editamos StyledCard (compartilhado por
 * ~45 arquivos do painel do gestor) — isto é uma cópia mínima, só do
 * desenho das cantoneiras (mesmo markup de CardDecorator), usada só aqui.
 */
export function KpiFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative p-3", className)}>
      <span
        aria-hidden="true"
        className="border-primary absolute top-0 left-0 z-10 block size-2.5 border-t-2 border-l-2 pointer-events-none"
      />
      <span
        aria-hidden="true"
        className="border-primary absolute top-0 right-0 z-10 block size-2.5 border-t-2 border-r-2 pointer-events-none"
      />
      <span
        aria-hidden="true"
        className="border-primary absolute bottom-0 left-0 z-10 block size-2.5 border-b-2 border-l-2 pointer-events-none"
      />
      <span
        aria-hidden="true"
        className="border-primary absolute bottom-0 right-0 z-10 block size-2.5 border-b-2 border-r-2 pointer-events-none"
      />
      {children}
    </div>
  );
}
