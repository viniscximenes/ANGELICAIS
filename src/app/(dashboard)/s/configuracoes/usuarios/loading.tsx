// Suspense fallback de /s/configuracoes/usuarios (F5) — mesmo padrão de
// /s/bases/kpi: mesmo wrapper/paddings/fonte de page.tsx e skeleton nas
// posições reais. Fica na tela por no mínimo MIN_LOADING_MS (piso aplicado
// em page.tsx).
import { Instrument_Sans } from "next/font/google";

import "./configuracoes-usuarios.css";
import { UsersSkeleton } from "@/components/config/usuarios/users-skeleton";

const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export default function LoadingConfigUsuarios() {
  return (
    <div
      data-page="config-usuarios"
      className={`min-h-screen px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
    >
      <UsersSkeleton />
    </div>
  );
}
