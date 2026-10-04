import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Fork local de StyledCard (src/components/gestor/styled-card.tsx) — mesmo
 * padrão já adotado em /kpi/operadores (ver
 * app/(dashboard)/kpi/operadores/_components/kpi-frame.tsx): o conteúdo
 * desta página deve manter só as cantoneiras (marca visual dos 4 vértices,
 * cor --primary), sem a borda/fundo/gradiente/raio que StyledCard adiciona
 * por baixo do Card (shadcn) — esse "container" foi removido daqui para
 * igualar a estrutura das rotas Zen Linen já migradas (nenhuma delas boxa o
 * conteúdo com StyledCard). Não editamos StyledCard (compartilhado por
 * ~45 arquivos do painel do gestor) — isto é uma cópia mínima, usada só
 * nesta rota.
 */
export function ConfigFrame({ children, className }: { children: ReactNode; className?: string }) {
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
