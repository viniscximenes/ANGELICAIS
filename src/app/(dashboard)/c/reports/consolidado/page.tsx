import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

// Mesmo CSS escopado de /s/reports/consolidado (data-page="reports-consolidado")
// — a visão do coordenador segue o padrão visual do Consolidado do gestor.
import "../../../s/reports/consolidado/reports-consolidado.css";
import "./coordenador-consolidado.css";
import { CoordenadorConsolidadoView } from "@/components/coordenador/coordenador-consolidado";
import { SignatureFooter } from "@/components/gestor/signature-footer";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getCoordenadorConsolidado } from "@/lib/coordenador/get-coordenador-consolidado";
import { getMetasPolo } from "@/lib/coordenador/meta-polo";

export const metadata: Metadata = {
  title: "Coordenação - Consolidado",
};

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const revalidate = 300;

// Piso mínimo do loading (mesma regra de /s/reports/consolidado): o
// loading.tsx (esqueleto) fica no mínimo 3s na tela — no F5 e no reload
// automático depois de colar uma base — em vez de piscar quando os dados
// voltam rápido. Atrasa só o que faltar desde a entrada na função.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function CoordenadorConsolidadoPage() {
  const inicioCarregamento = Date.now();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!can(user.profile.role, "view_coordenador_panel")) {
    redirect(getPostLoginPath(user.profile.role));
  }

  const { meta, metasTemas, cardsRecolhidos } = await getMetasPolo(user.profile.id);
  const dados = await getCoordenadorConsolidado(meta);

  await aguardarPisoMinimo(inicioCarregamento);

  return (
    <div
      data-page="reports-consolidado"
      // Gancho da barra de rolagem da página (só /c) — coordenador-consolidado.css.
      data-coord-pagina
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div className="mx-auto max-w-7xl space-y-10">
        <CoordenadorConsolidadoView
          dados={dados}
          meta={meta}
          metasTemas={metasTemas}
          cardsRecolhidos={cardsRecolhidos}
        />
        <SignatureFooter />
      </div>
    </div>
  );
}
