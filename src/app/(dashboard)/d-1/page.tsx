import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContratosSection } from "@/components/d-1/contratos-section";
import { D1Header } from "@/components/d-1/d1-header";
import { EquipeSection } from "@/components/d-1/equipe-section";
import { KpiCards } from "@/components/d-1/kpi-cards";
import { MotivosSection } from "@/components/d-1/motivos-section";
import { PageTransition } from "@/components/motion/page-transition";
import { filterByUserEmail } from "@/lib/d1/filter-by-user";
import { getD1Data } from "@/lib/google/d1";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "D-1 — ANGELICAIS",
};

// Força revalidação a cada 5 minutos (cache do Next.js)
export const revalidate = 300;

export default async function D1Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cruzamento: email do auth do supabase é {username}@interno.angelicais.app
  // Convertemos pra email corporativo: {username}@alloha.com
  const username = user.email?.split("@")[0] ?? "";
  const corporateEmail = "samyrha.fenix@alloha.com"; // TODO: hack temporário pra preview

  let d1Data;
  try {
    console.log("[page d-1] chamando getD1Data");
    d1Data = await getD1Data();
    console.log("[page d-1] getD1Data ok");
  } catch (err) {
    console.error("[page d-1] erro em getD1Data:", err);
    throw err;
  }
  const userView = filterByUserEmail(d1Data, corporateEmail);

  console.log("[d-1 page] corporateEmail:", corporateEmail);
  console.log(
    "[d-1 page] d1Data.consolidado.operadores emails:",
    d1Data.consolidado.operadores.map((o) => o.email),
  );
  console.log("[d-1 page] userView.operador:", userView.operador);
  console.log("[d-1 page] userView.contratos:", userView.contratos);
  console.log("[d-1 page] userView.motivos:", userView.motivos);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-12">
          <D1Header horaReport={userView.horaReport} />
          <KpiCards operador={userView.operador} />
          <MotivosSection motivos={userView.motivos} />
          <ContratosSection contratos={userView.contratos} />
          {/* TODO: quando criarmos roles, esta seção só deve renderizar
              para users com permissão "manage_base" ou role gestor/admin */}
          <EquipeSection
            operadores={d1Data.consolidado.operadores}
            equipe={d1Data.consolidado.equipe}
          />
        </div>
      </div>
    </PageTransition>
  );
}
