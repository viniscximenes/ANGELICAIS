import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./kpi-evolucao.css";
import { AnaliseOperadoresSection } from "@/components/operacional/analise-operadores/analise-operadores-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import {
  deriveNomeOperador,
  formatNomeProprio,
} from "@/lib/gestor/derive-nome-operador";
import { getSnapshotsSummary } from "@/lib/kpi/bases/get-snapshots-summary";
import { getKpisPreview } from "@/lib/kpi/analise-operadores/serial-types";

export const metadata: Metadata = {
  title: "KPI - Evolução",
};

// Fonte do tema Zen Linen — carregada só nesta rota (mesmo padrão de
// /kpi/operadores, /kpi/gestor e /kpi/detalhado-polo: next/font/google gera
// uma variável escopada ao módulo que a importa, referenciada só dentro de
// [data-page="kpi-evolucao"] em kpi-evolucao.css, então não afeta nenhuma
// outra página).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Página personalizada por gestor — nunca cacheada entre usuários.
export const dynamic = "force-dynamic";

export default async function KpiEvolucaoPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const [roster, snapshotsSummary, kpisPreview] = await Promise.all([
    getRosterOperadoresGestor(user.profile.id),
    getSnapshotsSummary(),
    // Só os nomes dos KPIs (sem dado de operador) — alimenta os cards
    // "fantasma" do estado vazio (sem operador selecionado), ver
    // EstadoVazioOperador em analise-operadores-section.tsx.
    getKpisPreview(),
  ]);

  // Operadores selecionáveis = EXATAMENTE o roster de /configuracoes/equipe.
  // Rótulo = "nome.sobrenome" da parte local do e-mail (deriveNomeOperador).
  // Esta página NÃO usa nome fantasia (o roster é 100% nome.sobrenome@alloha.com).
  const operadores = roster
    .map((email) => ({
      email,
      nome: deriveNomeOperador(email),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const mesMaisRecenteDisponivel = snapshotsSummary[0]?.mesRef ?? null;

  return (
    <PageTransition>
      <div
        data-page="kpi-evolucao"
        className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div className="mx-auto max-w-7xl">
          {/*
            Cabeçalho (título + linha de contexto + controles) é renderizado
            inteiro dentro de AnaliseOperadoresSection — mesmo padrão de
            /kpi/operadores, /kpi/gestor e /kpi/detalhado-polo: o operador/
            período selecionados e o estado de carregamento dependem de
            estado client que só existe lá dentro.
          */}
          <AnaliseOperadoresSection
            operadores={operadores}
            mesMaisRecenteDisponivel={mesMaisRecenteDisponivel}
            gestorNome={formatNomeProprio(user.profile.fullName)}
            kpisPreview={kpisPreview}
          />
        </div>
      </div>
    </PageTransition>
  );
}
