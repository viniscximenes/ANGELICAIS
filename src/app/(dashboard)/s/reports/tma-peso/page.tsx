import type { Metadata } from "next";
import { redirect } from "next/navigation";

import "./reports-tma-peso.css";

import { ConsolidadoScrollProgress } from "@/components/gestor/consolidado-scroll-progress";
import { FonteInter } from "@/components/gestor/fonte-inter";
import { AnaliticoTmaSection } from "@/components/tma/analitico-tma-section";
import { GestorTmaSection } from "@/components/tma/gestor-tma-section";
import { TmaNavSidebar } from "@/components/tma/tma-nav-sidebar";
import type { TmaLinha } from "@/components/tma/tma-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";
import { getGestorTma } from "@/lib/tma/get-gestor-tma";
import { getGestorTmaAnalitico } from "@/lib/tma/get-gestor-tma-analitico";
import { getGestorTmaAtendimentos } from "@/lib/tma/get-gestor-tma-atendimentos";

export const metadata: Metadata = {
  title: "Reports - TMA & Peso",
};

// Piso mínimo de loading — mesmo de /s/reports/consolidado: se os dados
// voltarem rápido, o loading.tsx não fica só piscando na tela. Contado
// desde a entrada na função; se as buscas já demoraram mais, não espera.
const MIN_LOADING_MS = 1_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function ReportsTmaPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela (com ou sem
  // is_admin_skill — a role continua "GESTOR"). O ADM puro é redirecionado
  // aqui e, de qualquer forma, o middleware já o confina a /bases e
  // /configuracoes antes de chegar nesta rota.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // Roster e threshold do TMA são memoizados por requisição (cache()), então
  // getGestorTma/getGestorTmaAnalitico não os consultam de novo.
  const [
    { operadores, reportHora, reportNomeSupervisor, metaAtualMmSs, ordemTabela },
    nomeFantasiaConfig,
    atendimentosPorOperador,
    analitico,
    roster,
  ] = await Promise.all([
    getGestorTma(user.profile.id),
    getNomeFantasiaConfig(user.profile.id),
    getGestorTmaAtendimentos(user.profile.id),
    getGestorTmaAnalitico(user.profile.id),
    getRosterOperadoresGestor(user.profile.id),
  ]);

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  const linhas: TmaLinha[] = operadores.map((op) => ({
    ...op,
    nomeExibicao: resolverNomeExibicao(op.operatorEmail, nomeFantasia),
  }));

  const showUpload = can(user.profile.role, "manage_d1_base");

  // Piso mínimo de loading (ver comentário em MIN_LOADING_MS acima) —
  // aplicado depois de TODAS as buscas em paralelo acima.
  await aguardarPisoMinimo(inicioCarregamento);

  // Sem <PageTransition>: o conteúdo já vem pronto via SSR e o loading.tsx
  // cobre a espera (mesmo motivo documentado em reports/consolidado/page.tsx).
  return (
    <>
      <ConsolidadoScrollProgress />
      {/* Navegação lateral da página (position: fixed, fora do container). */}
      <TmaNavSidebar />
      <FonteInter dataPage="reports-tma-peso" toastClass="toast-padrao" />

      <div data-page="reports-tma-peso" className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-10">
            <GestorTmaSection
              linhas={linhas}
              atendimentosPorOperador={Object.fromEntries(atendimentosPorOperador)}
              reportHora={reportHora ?? "—"}
              reportNomeSupervisor={reportNomeSupervisor}
              metaAtualMmSs={metaAtualMmSs}
              ordemTabela={ordemTabela}
              showUpload={showUpload}
              nomeFantasia={nomeFantasia}
              olhoInicial={nomeFantasiaConfig.olhoTma}
              thresholdConfig={analitico.thresholdConfig}
            />

            <AnaliticoTmaSection roster={roster} analitico={analitico} operadores={operadores} />
          </div>
        </div>
      </div>
    </>
  );
}
