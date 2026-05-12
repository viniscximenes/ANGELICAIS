import type { Metadata } from "next";
import { IconAlertTriangle } from "@tabler/icons-react";

import { D1Header } from "@/components/d-1/d1-header";
import { D1Tabs } from "@/components/d-1/d1-tabs";
import { PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = {
  title: "Indisponibilidade — D-1 ANGELICAIS",
};

export default function IndisponibilidadePage() {
  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <D1Header horaReport="—" />
          <D1Tabs />

          <div className="elevation-1 rounded-xl p-16 text-center">
            <IconAlertTriangle
              size={48}
              className="text-muted-foreground mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="ds-h2 mb-2">Em construção</h2>
            <p className="ds-body text-muted-foreground mx-auto max-w-md">
              A visualização de indisponibilidade estará disponível em breve.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
