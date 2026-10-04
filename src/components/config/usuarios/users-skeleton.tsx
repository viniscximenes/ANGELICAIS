import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";

/**
 * Skeleton de /s/configuracoes/usuarios (loading.tsx, no F5) — mesmas formas
 * do skeleton do Consolidado e de /s/bases (blocos bg-card arredondados,
 * cantoneiras reais via KpiFrame) nas posições do layout real. O tom dos
 * blocos vem de .config-usuarios-skeleton (configuracoes-usuarios.css).
 */

const LINHAS = 8;
// Login / Role / Ações (largura exata dos 3 botões) — users-table.tsx.
const COLUNAS = "grid grid-cols-[1.3fr_1fr_auto] items-center gap-3";

function SkeletonBloco({ className }: { className: string }) {
  return <div className={`rounded-md bg-card ${className}`} aria-hidden="true" />;
}

export function UsersSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="config-usuarios-skeleton mx-auto max-w-2xl space-y-4 animate-in fade-in duration-300 motion-reduce:animate-none"
      >
        {/* Cabeçalho: título "Usuários" + nome. */}
        <div className="pt-4">
          <SkeletonBloco className="h-9 w-[150px] md:h-10" />
          <div className="pt-3">
            <SkeletonBloco className="h-3.5 w-[260px] bg-card/70" />
          </div>
        </div>

        {/* Linha de controles: "Novo usuário" (h-8). */}
        <div className="flex items-center gap-2">
          <SkeletonBloco className="h-8 w-[128px] shrink-0" />
        </div>

        <KpiFrame>
          <div className="overflow-hidden">
            <div className={`${COLUNAS} h-[45px] bg-muted/40 px-3`}>
              <SkeletonBloco className="h-3 w-14 bg-muted-foreground/20" />
              <SkeletonBloco className="h-3 w-12 bg-muted-foreground/20" />
              <SkeletonBloco className="ml-auto h-3 w-14 bg-muted-foreground/20" />
            </div>
            {Array.from({ length: LINHAS }).map((_, i) => (
              <div key={i} className={`${COLUNAS} h-[53px] border-t border-border/40 px-3`}>
                <SkeletonBloco className="h-3.5 w-[70%]" />
                <SkeletonBloco className="h-5 w-16 rounded bg-card/70" />
                <div className="flex justify-end gap-2">
                  <SkeletonBloco className="h-8 w-[74px]" />
                  <SkeletonBloco className="h-8 w-[70px]" />
                  <SkeletonBloco className="h-8 w-[80px]" />
                </div>
              </div>
            ))}
          </div>
        </KpiFrame>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        Carregando usuários, aguarde.
      </div>
    </>
  );
}
