import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./reports-tma-peso.css";

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
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { getGestorTma } from "@/lib/tma/get-gestor-tma";
import { getGestorTmaAnalitico } from "@/lib/tma/get-gestor-tma-analitico";
import { getGestorTmaAtendimentos } from "@/lib/tma/get-gestor-tma-atendimentos";

export const metadata: Metadata = {
  title: "Reports - TMA & Peso",
};

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const revalidate = 300;

// Loading "fake" de piso mínimo — mesma técnica de /reports/consolidado
// (ver page.tsx daquela rota): o loading.tsx (Suspense fallback) foi
// desenhado pra replicar a posição exata dos cards da página real, mas se
// os dados voltarem rápido ele só pisca na tela por uma fração de segundo.
// Não dá pra controlar isso no client (loading.tsx é só o fallback
// declarativo do Suspense do Next) — o jeito é atrasar A PRÓPRIA resolução
// deste Server Component até completar MIN_LOADING_MS, contados desde a
// entrada na função. Se a busca real já demorou mais que isso,
// `aguardarPisoMinimo` não espera nada (Math.max trava em 0) — só estica
// quando sobrou tempo.
const MIN_LOADING_MS = 3_000;

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

  return (
    <div className={zenSans.variable}>
      <div data-page="reports-tma-peso">
        <TmaNavSidebar />
        <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
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

              <AnaliticoTmaSection
                roster={roster}
                analitico={analitico}
                operadores={operadores}
                nomeFantasia={nomeFantasia}
              />

              <SignatureFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
