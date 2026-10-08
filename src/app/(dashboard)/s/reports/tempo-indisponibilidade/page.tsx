import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "./reports-tempo-indisp.css";
import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import {
  TempoIndispSection,
  TituloTempoIndisp,
} from "@/components/dashboard/tempo-indisponibilidade/tempo-indisp-section";
import { ConsolidadoScrollProgress } from "@/components/gestor/consolidado-scroll-progress";
import { FonteInter } from "@/components/gestor/fonte-inter";
import { StyledCard } from "@/components/gestor/styled-card";
import { TOAST_CLASS } from "@/components/dashboard/tempo-indisponibilidade/constantes";
import { TempoIndispNavSidebar } from "@/components/gestor/tempo-indisp-nav-sidebar";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getPausasProgramadasOuErro } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
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
//
// RISCO-ACEITO: carregamento da página (navegação e reload após upload) espera no mínimo 1s mesmo com os dados prontos.
// Motivo: decisão de produto — sem o piso, o loading.tsx só pisca na tela (mesmo piso mantido no Consolidado nas auditorias de 2026-10-07).
// Mitigação: só estica quando a busca real foi mais rápida que 1s; re-render dentro de Server Action não espera (guarda `next-action` abaixo).
// Revisar quando: o usuário pedir pra remover o piso, ou o loading.tsx deixar de ser um esqueleto (sem "pulo" visual).
const MIN_LOADING_MS = 1_000;

async function aguardarPisoMinimo(desde: number) {
  // Re-render disparado por Server Action (mesma guarda do Consolidado): a
  // página é refeita DENTRO da resposta da action, sem loading.tsx na tela —
  // o piso só atrasaria a action em 1s. Hoje nenhuma action desta rota chama
  // revalidatePath; a guarda fica para o caso de alguma voltar a revalidar.
  if ((await headers()).has("next-action")) return;
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
  // o resto não espera nada. O roster e o d1_tempo_logado de hoje são
  // memoizados por requisição (cache() em get-roster-gestor.ts e
  // getTempoLogadoHojeEquipe), então getGestorTempoLogado/Indisponibilidade
  // não os consultam de novo.
  const configTabelaP = getConfigTabelaTempoIndisp(gestorId);
  const [
    dataTempoLogado,
    dataIndisponibilidade,
    nomeFantasiaConfig,
    pausasResultado,
    configAderencia,
    configTabelaTempoIndisp,
  ] = await Promise.all([
    getGestorTempoLogado(gestorId),
    configTabelaP.then((config) => getGestorIndisponibilidade(gestorId, config.metaIndisponibilidade)),
    getNomeFantasiaConfig(gestorId),
    // Variante que LANÇA: falha na base de pausas vira erro da página (abaixo),
    // não "Sem horários programados" na Aderência e no dialog.
    getRosterOperadoresGestor(gestorId).then((roster) =>
      getPausasProgramadasOuErro(roster).then(
        (pausas) => ({ pausas, erro: false }),
        () => ({ pausas: [], erro: true }),
      ),
    ),
    getConfigAderencia(gestorId),
    configTabelaP,
  ]);

  // Piso mínimo aplicado depois de TODAS as buscas, nos dois caminhos.
  await aguardarPisoMinimo(inicioCarregamento);

  const showUpload = can(user.profile.role, "manage_d1_base");

  // Falha de banco em qualquer leitura que muda o que a tela mostra também é
  // erro da página (mesma regra do Consolidado): os fallbacks revelariam
  // nomes reais com o olho fechado (nome fantasia), classificariam pela meta
  // padrão (config) ou mostrariam a equipe "sem dados" (roster/bases) e
  // "sem horários programados" (pausas programadas / config de aderência).
  const erro =
    dataTempoLogado.erro ||
    dataIndisponibilidade.erro ||
    nomeFantasiaConfig.erro ||
    configTabelaTempoIndisp.erro ||
    pausasResultado.erro ||
    configAderencia.erro;

  // Sem equipe (roster vazio → as duas listas vêm vazias): mesmo título e
  // mesma linguagem visual do Consolidado e, pra quem pode, o anexo da base.
  //
  // Erro de banco (erro=true): o MESMO card, com mensagem de erro e
  // "Tentar novamente" — antes caía aqui como "sem dados". Sem o anexo nesse
  // caso: com o banco falhando, o upload falharia também.
  if (
    erro ||
    dataTempoLogado.operadores.length === 0 ||
    dataIndisponibilidade.operadores.length === 0
  ) {
    return (
      <>
        <ConsolidadoScrollProgress />
        <FonteInter dataPage={DATA_PAGE} toastClass={TOAST_CLASS} />
        <div data-page={DATA_PAGE} className="pagina-padrao min-h-screen px-6 py-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="pt-4">
              <TituloTempoIndisp />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <StyledCard
                withGradient
                className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 p-10 text-center"
              >
                {erro ? (
                  <>
                    <h3 className="ds-h3 text-foreground font-semibold">
                      Não foi possível carregar a equipe
                    </h3>
                    <p className="ds-body text-muted-foreground max-w-md text-sm">
                      Houve uma falha ao consultar a base. Tente novamente em instantes.
                    </p>
                    {/* Link (não botão com JS): recarrega a rota pelo
                        servidor, passando pelo loading.tsx de sempre. Mesmo
                        visual do "Tentar novamente" do Consolidado. */}
                    <a
                      href="/s/reports/tempo-indisponibilidade"
                      className="font-sans border-border text-foreground hover:bg-muted/40 mt-2 inline-flex h-8 cursor-pointer items-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    >
                      Tentar novamente
                    </a>
                  </>
                ) : (
                  <>
                    <h3 className="ds-h3 text-foreground font-semibold">Ainda não há dados da equipe</h3>
                    <p className="ds-body text-muted-foreground max-w-md text-sm">
                      {showUpload
                        ? "Anexe a base do dia ao lado. Se ela já foi anexada, confira se há operadores cadastrados na sua equipe (Configurações → Equipe)."
                        : "Confira se há operadores cadastrados na sua equipe (Configurações → Equipe) e se a base do dia já foi atualizada."}
                    </p>
                  </>
                )}
              </StyledCard>

              {showUpload && !erro && (
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
      <FonteInter dataPage={DATA_PAGE} toastClass={TOAST_CLASS} />

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
            pausasProgramadas={pausasResultado.pausas}
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
