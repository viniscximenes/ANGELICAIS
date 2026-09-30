import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

// Mesmo CSS escopado de /reports/consolidado (data-page="reports-consolidado")
// — a visão do coordenador segue o padrão visual do Consolidado do gestor.
import "../../../reports/consolidado/reports-consolidado.css";
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

export default async function CoordenadorConsolidadoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!can(user.profile.role, "view_coordenador_panel")) {
    redirect(getPostLoginPath(user.profile.role));
  }

  const { meta, metaFinanceiro } = await getMetasPolo(user.profile.id);
  const dados = await getCoordenadorConsolidado(meta);

  return (
    <div
      data-page="reports-consolidado"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <div className="mx-auto max-w-7xl space-y-10">
        <CoordenadorConsolidadoView dados={dados} meta={meta} metaFinanceiro={metaFinanceiro} />
        <SignatureFooter />
      </div>
    </div>
  );
}
