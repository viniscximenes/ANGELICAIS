import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/page-transition";
import { KbList } from "@/components/config/base-conhecimento/kb-list";
import { PromptCard } from "@/components/config/base-conhecimento/prompt-card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getArtigos } from "@/lib/kb/get-artigos";
import { getConfigAction } from "@/lib/kb/actions/get-config-action";

export const metadata: Metadata = {
  title: "Base de Conhecimento — ANGELICAIS",
};

export default async function BaseConhecimentoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "GESTOR") redirect("/reports/consolidado");
  if (!can(user.profile.role, "manage_system")) redirect("/d-1");

  const [artigos, config] = await Promise.all([getArtigos(), getConfigAction()]);

  const artigosComLink = artigos.filter((a) => a.tipo === "artigo");
  const instrucoes = artigos.filter((a) => a.tipo === "instrucao");

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h1 className="ds-h1">Configurações</h1>
              <span className="ds-mono text-muted-foreground">
                / base de conhecimento
              </span>
            </div>
            <p className="ds-small text-muted-foreground">
              Prompt, artigos e instruções usados pelo assistente de
              procedimentos (/chat).
            </p>
          </div>

          <PromptCard promptInicial={config?.promptSistema ?? ""} />

          <KbList
            tipo="artigo"
            artigos={artigosComLink}
            title="Artigos"
            description="Conteúdo com link e fonte — a IA cita como referência ao responder."
            addLabel="Novo artigo"
            showSearch
            emptyLabel="Nenhum artigo cadastrado"
          />

          <KbList
            tipo="instrucao"
            artigos={instrucoes}
            title="Instruções"
            description="Contexto interno sobre como a IA deve se comportar — não é citado como fonte."
            addLabel="Nova instrução"
            emptyLabel="Nenhuma instrução cadastrada"
          />
        </div>
      </div>
    </PageTransition>
  );
}
