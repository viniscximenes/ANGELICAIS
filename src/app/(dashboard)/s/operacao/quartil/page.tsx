import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { redirect } from "next/navigation";

import "./operacao-quartil.css";
// CSS do Consolidado (só leitura, não editado): o card individual do
// operador (OperadorDetalheDialog) e seus toasts usam [data-page=
// "reports-consolidado"] / .reports-consolidado-toast — mesmo import de
// /s/operacao/comparativo. Todas as regras são escopadas a esse
// atributo/classe, então não afetam o resto desta página.
import "../../reports/consolidado/reports-consolidado.css";
import { QuartilSection } from "@/components/operacional/quartil/quartil-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";
import { fetchQuartilOperacaoAction } from "@/lib/retencao/quartil-operacao/actions";

export const metadata: Metadata = {
  title: "Operação - Quartil",
};

// Ranking calculado sobre a operação inteira, sempre "hoje" — nunca cacheada.
export const dynamic = "force-dynamic";

// Fonte do tema Zen Linen — carregada só nesta rota, mesmo padrão de
// /s/reports/consolidado e /s/operacao/comparativo.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Piso mínimo de loading — mesma regra de /s/reports/consolidado (ver
// comentário completo em s/reports/consolidado/page.tsx).
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function QuartilOperacaoPage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // Mesmo gate das demais telas do gestor: só role GESTOR. O ADM tem a
  // permissão view_gestor_panel mas é confinado a /bases e /configuracoes
  // pelo middleware.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const result = await fetchQuartilOperacaoAction();
  const nomeGestor = formatNomeProprio(user.profile.fullName);

  await aguardarPisoMinimo(inicioCarregamento);

  // Sem <PageTransition> — mesmo motivo de /s/reports/consolidado: o
  // loading.tsx já cobre a espera do Server Component.
  return (
    <div
      data-page="operacao-quartil"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Cabeçalho com as mesmas classes de /s/operacao/comparativo. */}
        <div className="pt-4 pb-2">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Quartil
          </h1>

          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">{nomeGestor}</p>
        </div>

        {!result.success ? (
          <div className="elevation-1 bg-card border border-border/60 rounded-xl p-8 text-center">
            <p className="ds-body text-danger font-medium">{result.error}</p>
          </div>
        ) : (
          <QuartilSection
            gestorLogado={result.data.gestorLogado}
            supervisores={result.data.supervisores}
          />
        )}
      </div>
    </div>
  );
}
