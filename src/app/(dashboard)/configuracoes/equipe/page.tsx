import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./configuracoes-equipe.css";
import { EquipeConfig } from "@/components/gestor/equipe-config";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { getEquipeAction } from "@/lib/gestor/equipe/actions";

export const metadata: Metadata = {
  title: "Configurações - Equipe",
};

// Fonte do tema Zen Linen — carregada só nesta rota (mesmo padrão de
// /kpi/operadores e /kpi/evolucao: next/font/google gera classes/variáveis
// escopadas ao módulo que as importa, e o CSS do tema
// (configuracoes-equipe.css) só as referencia dentro de
// [data-page="configuracoes-equipe"]; nenhuma outra rota é afetada).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const dynamic = "force-dynamic";

// Piso mínimo do skeleton (loading.tsx) — mesmo padrão de
// /s/reports/consolidado: se os dados voltarem rápido, o skeleton só
// piscaria na tela. Atrasa a resolução deste Server Component até completar
// MIN_LOADING_MS desde a entrada na função; se a busca já demorou mais que
// isso, não espera nada.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

/**
 * Unifica as duas telas antigas (/configuracoes/operadores-d1, que fazia o
 * CRUD do roster, e /configuracoes/operadores, que definia os apelidos).
 * As duas liam a mesma tabela por caminhos diferentes; aqui é uma lista só.
 */
export default async function ConfigEquipePage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const result = await getEquipeAction();

  await aguardarPisoMinimo(inicioCarregamento);

  return (
    <>
      <div
        data-page="configuracoes-equipe"
        className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        <div className="mx-auto max-w-2xl">
          {/*
            Cabeçalho — mesma estrutura de /kpi/operadores (h1 + linha de
            contexto em texto simples, sem eyebrow/breadcrumb e sem linha
            divisória): "Painel do Gestor" (eyebrow) e o prefixo
            "/ Configurações ·" foram removidos por serem redundantes (a
            própria página já se chama "Configurações - Equipe" e nenhuma
            rota migrada usa esse tipo de rótulo no cabeçalho).
          */}
          <div className="pt-4">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Equipe
            </h1>
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {formatNomeProprio(user.profile.fullName)}
            </p>

            {!result.ok && (
              <p className="font-sans text-xs text-destructive mt-3">
                Não foi possível carregar a equipe:{" "}
                <span className="font-medium">{result.error}</span>
              </p>
            )}
          </div>

          <div className="pt-8 space-y-6">
            <EquipeConfig
              ativoInicial={result.ok ? result.data.ativo : false}
              operadoresIniciais={result.ok ? result.data.operadores : []}
            />

            <p className="font-sans text-xs text-muted-foreground">
              Só operadores cadastrados aqui aparecem nas tabelas de Consolidado,
              Tempo Logado, Indisponibilidade e KPI da sua equipe. Remover um
              operador também apaga o apelido dele.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
