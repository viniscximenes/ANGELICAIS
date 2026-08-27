import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarcasSection } from "@/components/config/planos/marcas-section";
import { PlanosSection } from "@/components/config/planos/planos-section";
import { RegrasSection } from "@/components/config/planos/regras-section";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getAllMarcas } from "@/lib/config/planos/get-all-marcas";
import { getAllPlanosWithMarca } from "@/lib/config/planos/get-all-planos-with-marca";
import { getAllRegras } from "@/lib/config/planos/get-all-regras";

export const metadata: Metadata = {
  title: "Planos e Descontos — ANGELICAIS",
};

export default async function ConfigPlanosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) redirect("/d-1");

  const [marcas, planos, regras] = await Promise.all([
    getAllMarcas(),
    getAllPlanosWithMarca(),
    getAllRegras(),
  ]);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono text-muted-foreground">
                / planos e descontos
              </span>
            </div>
            <p className="ds-small text-muted-foreground">
              Gerencie marcas, planos e regras de desconto da operação.
            </p>
          </div>

          <MarcasSection marcas={marcas} />
          <PlanosSection marcas={marcas} planos={planos} />
          <RegrasSection regras={regras} />
        </div>
      </div>
    </PageTransition>
  );
}
