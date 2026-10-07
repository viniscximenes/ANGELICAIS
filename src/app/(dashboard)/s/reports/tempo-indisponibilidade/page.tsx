import type { Metadata } from "next";
import { redirect } from "next/navigation";

import "./reports-tempo-indisp.css";
import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import { TempoIndispSection } from "@/components/dashboard/tempo-indisponibilidade/tempo-indisp-section";
import { ConsolidadoScrollProgress } from "@/components/gestor/consolidado-scroll-progress";
import { FonteInter } from "@/components/gestor/fonte-inter";
import { StyledCard } from "@/components/gestor/styled-card";
import { TempoIndispNavSidebar } from "@/components/gestor/tempo-indisp-nav-sidebar";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
import { getGestorIndisponibilidade } from "@/lib/d1-db/get-gestor-indisponibilidade";
import { getGestorTempoLogado } from "@/lib/d1-db/get-gestor-tempo-logado";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { getConfigTabelaTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/get-config-tabela-tempo-indisp";
import { getNomeFantasiaConfig } from "@/lib/gestor/nome-fantasia/get-config";

export const metadata: Metadata = {
  title: "Reports - Tempo Logado & Indisponibilidade",
};

// Piso mínimo de loading — mesmo de /s/reports/consolidado: se os dados
// voltarem rápido, o loading.tsx não fica só piscando na tela. Contado
// desde a entrada na função; se as buscas já demoraram mais, não espera.
const MIN_LOADING_MS = 1_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

const DATA_PAGE = "reports-tempo-indisponibilidade";

export default async function ReportsTempoIndisponibilidadePage() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const gestorId = user.profile.id;

  // Uma onda só de buscas: a indisponibilidade espera só a config (precisa
  // da meta pra calcular cumpriuMeta) e as pausas programadas só o roster —
  // o resto não espera nada. O roster é memoizado por requisição (cache()
  // em get-roster-gestor.ts), então getGestorTempoLogado/Indisponibilidade
  // não o consultam de novo.
  const configTabelaP = getConfigTabelaTempoIndisp(gestorId);
  const [
    dataTempoLogado,
    dataIndisponibilidade,
    nomeFantasiaConfig,
    pausasProgramadas,
    configAderencia,
    configTabelaTempoIndisp,
  ] = await Promise.all([
    getGestorTempoLogado(gestorId),
    configTabelaP.then((config) => getGestorIndisponibilidade(gestorId, config.metaIndisponibilidade)),
    getNomeFantasiaConfig(gestorId),
    getRosterOperadoresGestor(gestorId).then((roster) => getPausasProgramadas(roster)),
    getConfigAderencia(gestorId),
    configTabelaP,
  ]);

  // Piso mínimo aplicado depois de TODAS as buscas, nos dois caminhos.
  await aguardarPisoMinimo(inicioCarregamento);

  const showUpload = can(user.profile.role, "manage_d1_base");

  // Sem equipe (roster vazio → as duas listas vêm vazias): mesmo título e
  // mesma linguagem visual do Consolidado e, pra quem pode, o anexo da base.
  if (
    dataTempoLogado.operadores.length === 0 ||
    dataIndisponibilidade.operadores.length === 0
  ) {
    return (
      <>
        <ConsolidadoScrollProgress />
        <FonteInter dataPage={DATA_PAGE} toastClass="toast-padrao" />
        <div data-page={DATA_PAGE} className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="pt-4">
              <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Tempo Logado &amp; Indisponibilidade
              </h1>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <StyledCard
                withGradient
                className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 p-10 text-center"
              >
                <h3 className="ds-h3 text-foreground font-semibold">Ainda não há dados da equipe</h3>
                <p className="ds-body text-muted-foreground max-w-md text-sm">
                  {showUpload
                    ? "Anexe a base do dia ao lado. Se ela já foi anexada, confira se há operadores cadastrados na sua equipe (Configurações → Operadores do D-1)."
                    : "Confira se há operadores cadastrados na sua equipe (Configurações → Operadores do D-1) e se a base do dia já foi atualizada."}
                </p>
              </StyledCard>

              {showUpload && (
                <div className="min-h-[220px] min-w-0 flex-1 self-stretch">
                  <UploadTempoLogadoDropzone abrirEmDownloads recarregarComModalAberto />
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const nomeFantasia = {
    ativo: nomeFantasiaConfig.ativo,
    mapa: Object.fromEntries(nomeFantasiaConfig.mapa),
  };

  // Sem <PageTransition>: o conteúdo já vem pronto via SSR e o loading.tsx
  // cobre a espera — um fade extra deixava a tela vazia entre o loading e
  // os dados (mesmo motivo documentado em reports/consolidado/page.tsx).
  return (
    <>
      <ConsolidadoScrollProgress />
      {/* Navegação lateral da página (position: fixed, fora do container). */}
      <TempoIndispNavSidebar />
      <FonteInter dataPage={DATA_PAGE} toastClass="toast-padrao" />

      <div data-page={DATA_PAGE} className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
          {/* Cabeçalho (título + "{supervisor} fez um report às {hora}" +
              controles) vive dentro de TempoIndispSection: depende de estado
              client atualizado por refetch() após as ações do gestor. */}
          <TempoIndispSection
            operadoresTempoLogadoIniciais={dataTempoLogado.operadores}
            operadoresIndisponibilidadeIniciais={dataIndisponibilidade.operadores}
            horaReportInicial={dataTempoLogado.horaReport ?? null}
            nomeSupervisorReportInicial={dataTempoLogado.nomeSupervisorReport}
            datasBaseReportInicial={dataTempoLogado.reportDatasBase ?? null}
            pausasProgramadas={pausasProgramadas}
            toleranciaMin={configAderencia.toleranciaMin}
            showUpload={showUpload}
            nomeFantasia={nomeFantasia}
            olhoInicial={nomeFantasiaConfig.olhoTempoIndisponibilidade}
            metaIndisponibilidadeInicial={configTabelaTempoIndisp.metaIndisponibilidade}
            ordemTabelaInicial={configTabelaTempoIndisp.ordemTabela}
          />
        </div>
      </div>
    </>
  );
}
