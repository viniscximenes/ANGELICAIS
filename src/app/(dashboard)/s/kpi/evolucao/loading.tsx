// Suspense fallback do Next.js pra /s/kpi/evolucao — mostrado enquanto o
// Server Component de page.tsx (roster, snapshots, prévia de KPIs e metas)
// não resolve. Só dispara em NAVEGAÇÃO de rota (entrar na página,
// inclusive acesso direto/F5) — trocar operador/período é estado client
// dentro de AnaliseOperadoresSection (RelatorioCarregando), não passa aqui.
//
// Mesma construção do loading de /s/reports/consolidado: SkeletonBloco
// bg-card com os tons de .kpi-evolucao-skeleton (kpi-evolucao.css — antes
// o skeleton era desfocado e a 40% de opacidade, e sumia no tema claro),
// sem spinner, entrada em fade. Geometria = a da página real: wrapper de
// page.tsx (data-page, paddings, max-w-7xl), título + subtítulo, linha de
// controles (engrenagem, "Selecionar operador", "Incluir mês atual" +
// switch, seletor de período à direita) e o relatório em skeleton
// (SkeletonRelatorio, o MESMO usado nas trocas dentro da página): 4 KPIs
// principais na janela padrão de 3 meses.
import { Instrument_Sans } from "next/font/google";

import "./kpi-evolucao.css";
import {
  SkeletonBloco,
  SkeletonRelatorio,
} from "@/components/operacional/analise-operadores/relatorio-fantasma";
import { PRINCIPAIS_SLUGS } from "@/lib/kpi/analise-operadores/constants";
import { MESES_JANELA, PERIODO_PADRAO } from "@/lib/kpi/analise-operadores/periodo";

// MESMA fonte/variável de page.tsx — o fallback monta antes de page.tsx.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;

export default function LoadingKpiEvolucao() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <div
        data-page="kpi-evolucao"
        className={`kpi-evolucao-skeleton relative min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div
          aria-hidden="true"
          className="mx-auto max-w-7xl animate-in fade-in space-y-2 duration-300 motion-reduce:animate-none"
        >
          <div>
            {/* Título (text-3xl/md:text-4xl) + subtítulo (text-sm). */}
            <div className="pt-4">
              <SkeletonBloco className="h-9 w-[150px] md:h-10" />
              <div className="flex h-5 items-center pt-3 box-content">
                <SkeletonBloco className="h-3.5 w-[320px] max-w-full bg-card/70" />
              </div>
            </div>

            {/* Linha de controles — todos com 32px de altura. */}
            <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <SkeletonBloco className="h-8 w-8 shrink-0" />
                <SkeletonBloco className="h-8 w-[172px]" />
                <div className="inline-flex h-8 items-center gap-2">
                  <SkeletonBloco className="h-3.5 w-[110px]" />
                  <SkeletonBloco className="h-[18px] w-8 rounded-full" />
                </div>
              </div>
              <div className="ml-auto">
                <SkeletonBloco className="h-8 w-[264px] rounded-[var(--radius)]" />
              </div>
            </div>
          </div>

          <SkeletonRelatorio
            nPrincipais={PRINCIPAIS_SLUGS.length}
            nMeses={MESES_JANELA[PERIODO_PADRAO]}
          />
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          Carregando Evolução, aguarde.
        </div>
      </div>
    </>
  );
}
