import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { redirect } from "next/navigation";

import "./operacao-diario.css";
import { DiarioSection } from "@/components/equipe/diario/diario-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getJustificativasPadrao } from "@/lib/equipe/diario/get-justificativas-padrao";
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

export default async function OperacaoDiarioPage() {
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
  const [roster, justificativasPadrao] = await Promise.all([
    getEquipeAction(),
    getJustificativasPadrao(),
  ]);
  const operadoresValidos = roster.ok
    ? roster.data.operadores.map((o) => o.email.split("@")[0])
    : [];
  const nomeGestor = formatNomeProprio(user.profile.fullName);

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
          <p className="mt-3 text-sm text-muted-foreground">
            {nomeGestor}
          </p>
        </header>

        <DiarioSection
          operadoresValidos={operadoresValidos}
          rosterErro={roster.ok ? null : roster.error}
          justificativasPadrao={justificativasPadrao}
          fontVariableClassName={zenSans.variable}
        />
      </div>
    </div>
  );
}
