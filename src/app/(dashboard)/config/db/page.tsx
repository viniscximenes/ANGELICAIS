import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconAdjustments, IconFileSpreadsheet } from "@tabler/icons-react";

import { DiasSalvosList } from "@/components/db/dias-salvos-list";
import { TemasConfigSection } from "@/components/db/temas-config-section";
import { UploadCsvDropzone } from "@/components/db/upload-csv-dropzone";
import { StyledCard } from "@/components/gestor/styled-card";
import { PageTransition } from "@/components/motion/page-transition";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getDiasDisponiveisAction } from "@/lib/db/actions/get-dias-disponiveis-action";
import { getTemasAction, getTemasVazioAction } from "@/lib/db/actions/get-temas-action";

export const metadata: Metadata = {
  title: "Diário de Bordo — ANGELICAIS",
};

export default async function ConfigDiarioDeBordoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.profile.role === "GESTOR") {
    redirect("/reports/consolidado");
  }

  if (!can(user.profile.role, "manage_system", user.profile.isAdminSkill)) {
    redirect("/d-1");
  }

  const [dias, temasPausa, temasTempoLogado, temasVazio] = await Promise.all([
    getDiasDisponiveisAction(),
    getTemasAction("pausa"),
    getTemasAction("tempo_logado"),
    getTemasVazioAction(),
  ]);

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                scrollbar-width: thin !important;
                scrollbar-color: var(--border) transparent !important;
              }
              html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
              }
              html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                background: transparent !important;
              }
              html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                background: var(--border) !important;
                border-radius: 4px !important;
              }
              html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                background: var(--muted-foreground) !important;
              }
            `,
          }}
        />
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel de Configurações
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Diário de Bordo
              </span>
            </div>
            <p className="ds-small text-muted-foreground mt-1">
              Suba o CSV diário de login/pausas e configure os temas usados pelos supervisores na página DB.
            </p>
          </header>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-1">
              <div className="flex items-center gap-3">
                <h2 className="ds-h2 flex items-center gap-2">
                  <IconFileSpreadsheet className="text-muted-foreground size-4" aria-hidden="true" />
                  Upload do CSV
                </h2>
              </div>
            </div>

            <div className="border-t border-dashed border-border pt-4">
              <StyledCard withGradient className="p-6 space-y-6">
                <UploadCsvDropzone />

                <div className="space-y-3 pt-2">
                  <h3 className="ds-mono-sm text-muted-foreground uppercase tracking-widest font-semibold text-xs flex items-center gap-2">
                    Dias Salvos
                  </h3>
                  <DiasSalvosList dias={dias} />
                </div>
              </StyledCard>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-1">
              <div className="flex items-center gap-3">
                <h2 className="ds-h2 flex items-center gap-2">
                  <IconAdjustments className="text-muted-foreground size-4" aria-hidden="true" />
                  Configuração de Temas
                </h2>
              </div>
            </div>

            <div className="border-t border-dashed border-border pt-4">
              <StyledCard withGradient className="p-6 space-y-4">
                <TemasConfigSection
                  temasPausa={temasPausa}
                  temasTempoLogado={temasTempoLogado}
                  mostrarSeed={temasVazio}
                />
              </StyledCard>
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
