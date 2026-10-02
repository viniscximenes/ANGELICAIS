import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { redirect } from "next/navigation";

import "./operacao-diario.css";
import { DiarioSection } from "@/components/equipe/diario/diario-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getEquipeAction } from "@/lib/gestor/equipe/actions";

export const metadata: Metadata = {
  title: "Operação - Diário",
};

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const dynamic = "force-dynamic";

// Piso mínimo do loading.tsx (skeleton) — mesmo padrão de
// /s/reports/consolidado: se os dados voltarem rápido, o skeleton não pisca.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function OperacaoDiarioPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Gate explícito por role: só GESTOR acessa esta tela (mesmo escopo de
  // "MEUS RESULTADOS" / Reports).
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  // Única leitura no Supabase: o roster do gestor (mesma fonte de
  // /configuracoes/equipe). Só serve para filtrar quais operadores podem
  // aparecer no relatório — nada é gravado.
  const roster = await getEquipeAction();
  const operadoresValidos = roster.ok
    ? roster.data.operadores.map((o) => o.email.split("@")[0])
    : [];
  const nomeGestor = formatNomeProprio(user.profile.fullName);

  await aguardarPisoMinimo(inicioCarregamento);

  return (
    <div
      data-page="operacao-diario"
      className={`${zenSans.variable} min-h-screen px-6 py-8 lg:px-12 lg:py-12`}
    >
      <div className="mx-auto max-w-7xl">
        <header className="pb-6 pt-4">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Diário
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{nomeGestor}</p>
        </header>

        <DiarioSection
          operadoresValidos={operadoresValidos}
          rosterErro={roster.ok ? null : roster.error}
          fontVariableClassName={zenSans.variable}
        />
      </div>
    </div>
  );
}
