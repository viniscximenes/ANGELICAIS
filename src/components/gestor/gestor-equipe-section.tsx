"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconEye, IconEyeOff, IconCoin } from "@tabler/icons-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { CopyTableButton } from "@/components/d-1/copy-table-button";
import { EquipeTable } from "@/components/d-1/equipe-table";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { ConfigTabelaPopover } from "@/components/gestor/config-tabela-popover";
import { StyledCard } from "@/components/gestor/styled-card";
import { clearConsolidadoAction } from "@/lib/d1-db/actions/clear-consolidado-action";
import { refreshConsolidadoAction } from "@/lib/d1-db/actions/refresh-consolidado-action";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import {
  DEFAULT_META_TX_RETENCAO,
  DEFAULT_ORDEM_TABELA,
  DEFAULT_SHOW_RV_DIARIO,
  type OrdemTabela,
} from "@/lib/gestor/config-tabela/types";
import { ordenarOperadores } from "@/lib/gestor/config-tabela/ordenar-operadores";
import { toggleShowRvDiarioAction } from "@/lib/gestor/config-tabela/actions/toggle-show-rv-diario-action";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { cn } from "@/lib/utils";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { fetchOperadorDetalheAction } from "@/lib/retencao/actions";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";
import { OperadorDetalheDialog } from "@/components/dashboard/retencao/operador-detalhe-dialog";
import { notifyBaseAtualizada } from "@/lib/retencao/base-cleared-event";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Intervalo do polling: reconsulta a base a cada 30s para refletir mudanças
// sem precisar de F5.
const POLL_INTERVAL_MS = 30_000;

// CAUSA RAIZ da última coluna (Tx Retenção/RV Diário) cortada: o wrapper
// abaixo define `width: 760px/920px` esperando que seja EXATAMENTE a
// largura útil pro grid da EquipeTable (BASE_COLUMN_WIDTHS_PX soma 760 +
// RV_COLUMN_PX quando ligado, ver equipe-table.tsx) — mas esse width é do
// DIV EXTERNO, que ainda contém o StyledCard com padding (`p-3` = 12px por
// lado) + borda (`border` = 1px por lado) por DENTRO dele. Como StyledCard
// é `overflow-visible`, mas o container real da tabela (TABELA_CONTAINER_
// CLASS) é `overflow-hidden` e só recebe a largura ATRIBUÍDA A ELE pelo
// pai (760/920 menos o padding+borda do StyledCard), o grid interno (que
// usa pixels fixos, não encolhe) ficava ~26px mais largo que esse espaço
// disponível — os 26px que sobravam do lado direito eram cortados pelo
// overflow-hidden. Compensado somando esse "chrome" do StyledCard à
// largura do wrapper externo, pra área de conteúdo real bater 760/920.
const TABELA_CARD_CHROME_PX = 26; // 2 × (padding 12px + borda 1px)

interface GestorEquipeSectionProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  /** Nome da gestora — usado no texto do report copiado. */
  gestora?: string;
  /** Mostra a área de upload da base (gated por manage_d1_base na página). */
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  /** Nome do supervisor que fez o último report (BASE - 1!S2, junto com a hora). */
  nomeSupervisorReport?: string | null;
  /** Meta de TX Retenção (%, escala 0-100) — config do gestor, `gestor_config_fantasia.meta_tx_retencao`. */
  metaTxInicial?: number;
  /** Ordenação salva da tabela — `gestor_config_fantasia.ordem_tabela`. */
  ordemTabelaInicial?: OrdemTabela;
  /** Toggle "RV Diário" salvo — `gestor_config_fantasia.show_rv_diario`. */
  showRvDiarioInicial?: boolean;
}

export function GestorEquipeSection({
  operadores: operadoresIniciais,
  equipe: equipeInicial,
  gestora,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  nomeSupervisorReport: nomeSupervisorReportInicial = null,
  metaTxInicial = DEFAULT_META_TX_RETENCAO,
  ordemTabelaInicial = DEFAULT_ORDEM_TABELA,
  showRvDiarioInicial = DEFAULT_SHOW_RV_DIARIO,
}: GestorEquipeSectionProps) {
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [operadores, setOperadores] = useState(operadoresIniciais);
  const [equipe, setEquipe] = useState(equipeInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(
    nomeSupervisorReportInicial,
  );
  const [metaTxRetencao, setMetaTxRetencao] = useState(metaTxInicial);
  const [ordemTabela, setOrdemTabela] = useState(ordemTabelaInicial);
  // Espelha o open/close do ConfigTabelaPopover só pra elevar a tabela acima
  // do overlay de blur (z-40) enquanto o popover está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  // rvDiario já vem calculado do servidor pra todo mundo, então ligar/desligar
  // não dispara fetch de dados — só persiste a preferência (upsert parcial,
  // mesmo padrão do handleToggleOlho).
  const [showRvDiario, setShowRvDiario] = useState(showRvDiarioInicial);

  // Detalhamento individual do operador (clique no nome da EquipeTable) —
  // busca sob demanda via fetchOperadorDetalheAction (retencao_atendimentos),
  // desacoplado do carregamento pesado do bloco analítico (que só roda
  // quando aquela seção entra em vista). Antes vivia dentro do card
  // "Operadores" do trilho horizontal; migrado pra cá quando esse card foi
  // removido (o dado já estava disponível ali, agora é buscado no clique).
  const [operadorSelecionado, setOperadorSelecionado] = useState<OperadorIndividual | null>(null);
  const [operadorQuartil, setOperadorQuartil] = useState<QuartilOperador | null>(null);
  const [operadorMeta, setOperadorMeta] = useState(DEFAULT_META_TX_RETENCAO);
  const [operadorDialogOpen, setOperadorDialogOpen] = useState(false);
  const [operadorDialogLoading, setOperadorDialogLoading] = useState(false);

  // Prefetch no hover — a causa real da demora pra abrir o dialog é a
  // PRÓPRIA busca (fetchOperadorDetalheAction faz até 3 varreduras de
  // retencao_atendimentos, uma delas — o ranking de quartil da empresa —
  // sem filtro nenhum, escaneando a base inteira), não o dialog em si (que
  // já anima em 100ms). Prefetch não resolve o custo da query, mas esconde
  // a latência: se o mouse ficar parado numa linha por ~180ms, já dispara
  // a mesma busca; se o usuário clicar depois, reaproveita essa promise em
  // vez de disparar outra.
  const PREFETCH_DEBOUNCE_MS = 180;
  const prefetchCacheRef = useRef<Map<string, ReturnType<typeof fetchOperadorDetalheAction>>>(
    new Map(),
  );
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOperadorHoverStart(emailOriginal: string) {
    if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);
    if (prefetchCacheRef.current.has(emailOriginal)) return;
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchCacheRef.current.set(emailOriginal, fetchOperadorDetalheAction(emailOriginal));
    }, PREFETCH_DEBOUNCE_MS);
  }

  function handleOperadorHoverEnd() {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }

  async function handleOperadorClick(emailOriginal: string) {
    if (operadorDialogLoading) return;
    setOperadorDialogLoading(true);
    try {
      // Reaproveita a promise já em voo (ou já resolvida) do prefetch de
      // hover, se existir, em vez de refazer a mesma busca do zero.
      const emVoo = prefetchCacheRef.current.get(emailOriginal);
      prefetchCacheRef.current.delete(emailOriginal);
      const result = await (emVoo ?? fetchOperadorDetalheAction(emailOriginal));
      if (result.success) {
        setOperadorSelecionado(result.data.operador);
        setOperadorQuartil(result.data.quartil);
        setOperadorMeta(result.data.meta);
        setOperadorDialogOpen(true);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      if (!handleStaleActionError(err)) {
        console.error("[GestorEquipeSection] erro ao buscar detalhamento do operador:", err);
        toast.error("Erro ao carregar detalhamento do operador.");
      }
    } finally {
      setOperadorDialogLoading(false);
    }
  }

  function resolverNomeOperador(op: OperadorIndividual): string {
    return op.login.split("@")[0] || op.login;
  }

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    toggleOlhoAction("consolidado", novoValor).catch((err) => {
      if (!handleStaleActionError(err)) {
        console.error("[GestorEquipeSection] erro ao salvar preferência de olho:", err);
      }
    });
  }

  function handleToggleRvDiario() {
    const novoValor = !showRvDiario;
    setShowRvDiario(novoValor);
    toggleShowRvDiarioAction(novoValor).catch((err) => {
      if (!handleStaleActionError(err)) {
        console.error("[GestorEquipeSection] erro ao salvar preferência de RV Diário:", err);
      }
    });
  }

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refetch usado tanto pelo polling quanto (imediatamente, sem esperar os
  // 30s) pelo ClearBaseButton — mesma fonte, dois gatilhos.
  async function refetchConsolidado() {
    try {
      const result = await refreshConsolidadoAction();
      if (result.success) {
        setOperadores(result.operadores);
        setEquipe(result.equipe);
        setNomeSupervisorReport(result.nomeSupervisorReport);
      }
    } catch (err) {
      // Server Action de um build anterior (hot reload em dev, ou deploy
      // novo em produção com a aba aberta): avisa o usuário uma única vez e
      // para o polling, em vez de repetir a mesma falha a cada 30s pra sempre.
      if (handleStaleActionError(err)) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }
      console.error("[GestorEquipeSection] erro ao atualizar consolidado (polling):", err);
    }
  }

  // Handler específico do "Limpar Base" (não reaproveitado pelo polling):
  // além de recarregar a EquipeTable (mesmo refetch de sempre), avisa a
  // árvore irmã (RetencaoDetalheSection, bloco analítico) que
  // retencao_atendimentos também foi esvaziada — clearConsolidadoAction já
  // limpa as duas tabelas no mesmo clique, mas cada seção busca seus dados
  // de forma independente, então cada lado precisa do próprio refetch.
  async function handleBaseCleared() {
    await refetchConsolidado();
    notifyBaseAtualizada();
  }

  // Polling: reconsulta a base a cada 30s (sem F5) e atualiza operadores +
  // hora/nome do report se houver mudança.
  useEffect(() => {
    pollIntervalRef.current = setInterval(refetchConsolidado, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Navegação via teclado: setas Cima (ArrowUp) e Baixo (ArrowDown) rolam a página.
  //
  // Usa lenis.scrollTo (não window.scrollBy nativo): o Lenis já controla o
  // scroll da página via seu próprio RAF (ver LenisProvider). Se o scroll
  // nativo com behavior:"smooth" mexer no scrollTop por fora do Lenis, o
  // Lenis mantém internamente um alvo de scroll (`animatedScroll`) que fica
  // dessincronizado do scroll real — no primeiro wheel/touch seguinte ele
  // "puxa" a página de volta pro alvo antigo, travando/anulando o scroll das
  // setas. Passar pelo lenis.scrollTo mantém os dois em sincronia (isso
  // também evita a página "pular" um trecho inteiro do scroll horizontal
  // pinado por ScrollTrigger, que também lê a posição real do scroll).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      if (isInput) return;

      const lenis = getLenisInstance();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(lenis.animatedScroll + 120, { duration: 0.4 });
        } else {
          window.scrollBy({ top: 120, behavior: "smooth" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(lenis.animatedScroll - 120, { duration: 0.4 });
        } else {
          window.scrollBy({ top: -120, behavior: "smooth" });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Quando o olho está aberto, revela o nome real derivado do email original.
  // A tabela PNG usa sempre `operadores` (nomes fantasia já resolvidos no server).
  const operadoresParaTela = useMemo(() => {
    if (!nomeFantasia?.ativo || !olhoAberto) return operadores;
    return operadores.map((op) => ({
      ...op,
      email: deriveNomeOperador(op.emailOriginal ?? op.email),
    }));
  }, [operadores, nomeFantasia, olhoAberto]);

  // Ordenação escolhida pelo gestor (config-tabela-popover). Aplicada tanto
  // na tabela visível (operadoresParaTela) quanto na variante PNG oculta
  // (operadores puro), pra exportação refletir a mesma ordem da tela.
  const operadoresOrdenados = useMemo(
    () => ordenarOperadores(operadoresParaTela, ordemTabela),
    [operadoresParaTela, ordemTabela],
  );
  const operadoresPngOrdenados = useMemo(
    () => ordenarOperadores(operadores, ordemTabela),
    [operadores, ordemTabela],
  );

  // EquipeTable trabalha com meta em fração (0-1); a config do gestor é
  // salva em percentual (0-100), igual à meta do Dashboard de Retenção.
  const metaTxFracao = metaTxRetencao / 100;

  return (
    <motion.section
      id="equipe-section"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      <div>
        {/*
          pt-0 (não py-4 nos dois lados): o espaço ACIMA do título "Equipe"
          já vem do mb-* do <header> da página (page.tsx) — somar padding
          próprio aqui em cima criava um vazio duplicado entre o cabeçalho
          da página e este título. pb-4 continua igual (separa o título da
          EquipeTable abaixo, isso não estava sendo reclamado).
        */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-0 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="ds-h2">Equipe</h2>
            {formatReportLabel(equipe.horaReport, nomeSupervisorReport) && (
              <span className="ds-mono-sm text-foreground/80 font-medium">
                - {formatReportLabel(equipe.horaReport, nomeSupervisorReport)}
              </span>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleToggleRvDiario}
              aria-pressed={showRvDiario}
              className={cn(
                "ds-mono-sm flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none",
                showRvDiario
                  ? "bg-primary text-primary-foreground border-primary hover:opacity-90"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
              )}
              style={{ fontSize: "12px" }}
            >
              <IconCoin size={14} aria-hidden="true" />
              <span>RV Diário</span>
            </button>

            <CopyTableButton
              operadores={operadores}
              equipe={equipe}
              supervisor={gestora}
              nomeSupervisorReport={nomeSupervisorReport}
            />
            {showUpload && (
              <ClearBaseButton action={clearConsolidadoAction} onCleared={handleBaseCleared} />
            )}
            <ConfigTabelaPopover
              metaTxInicial={metaTxRetencao}
              ordemInicial={ordemTabela}
              onSaved={(metaTx, ordem) => {
                setMetaTxRetencao(metaTx);
                setOrdemTabela(ordem);
              }}
              onOpenChange={setConfigPopoverOpen}
            />
          </div>
        </div>

        {/*
          Wrapper INVISÍVEL usado SÓ pela captura do PNG. Vive off-screen pra
          não afetar o layout. Renderiza o MESMO card/tabela do site (variant
          "screen" padrão, dentro do mesmo StyledCard com as cantoneiras) —
          nada de template hardcoded à parte, pra imagem exportada sair
          idêntica ao que está na tela, nos dois temas.
          Usa `operadoresPngOrdenados` (não a lista com o "olho" aberto) de
          propósito: a imagem exportada nunca deve revelar nomes reais só
          porque o gestor tinha o nome fantasia temporariamente aberto na
          tela no momento do clique.
          O CopyTableButton procura por [data-tabela-png].
        */}
        <div
          data-equipe-png-wrapper
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-99999px",
            left: "-99999px",
            // 760px de base (as 5 colunas em `fr`) + 160px fixos da coluna
            // RV quando ativa (mesmo valor de RV_COLUMN_PX em
            // equipe-table.tsx) — os 760px continuam os MESMOS nos dois
            // casos, só a coluna extra soma por cima. Largura calibrada
            // pra "CANCELADOS"/"TX RETENÇÃO" (ds-body bold tracking-wide,
            // os headers mais longos da tabela) não truncarem, mesmo já
            // com padding reduzido nas células de header (px-3→px-2 em
            // tabela-padrao.tsx) e min-w-0 garantindo que os tracks do
            // grid do header/corpo fiquem idênticos. + TABELA_CARD_CHROME_PX
            // compensa o padding/borda do StyledCard por dentro (ver
            // comentário na constante).
            width: showRvDiario
              ? `${920 + TABELA_CARD_CHROME_PX}px`
              : `${760 + TABELA_CARD_CHROME_PX}px`,
          }}
        >
          <div data-tabela-png>
            <StyledCard withGradient className="p-3">
              <EquipeTable
                key="gestor-equipe-png"
                operadores={operadoresPngOrdenados}
                equipe={equipe}
                metaTx={metaTxFracao}
                showRvDiario={showRvDiario}
              />
            </StyledCard>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4 lg:flex-row lg:items-stretch">
          <div
            className={cn(
              "shrink-0 relative transition-[z-index] duration-0",
              configPopoverOpen && "z-[45]",
            )}
            style={{
              // Mesma largura-base do wrapper do PNG acima (760/920px +
              // TABELA_CARD_CHROME_PX) — ver comentário lá pro raciocínio
              // completo.
              width: showRvDiario
                ? `${920 + TABELA_CARD_CHROME_PX}px`
                : `${760 + TABELA_CARD_CHROME_PX}px`,
              maxWidth: "100%",
              // Mesma curva/duração da animação interna do toggle RV
              // (spring do motion em equipe-table.tsx, ~300-400ms) — são
              // duas animações tecnicamente separadas (CSS aqui, JS spring
              // lá dentro), mas afinadas pra parecerem UMA coisa só: a
              // borda do card e a coluna nova crescendo juntas, no mesmo
              // ritmo, em vez de terminarem em momentos diferentes.
              transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <StyledCard withGradient className="h-full p-3">
              <EquipeTable
                key="gestor-equipe-visible"
                operadores={operadoresOrdenados}
                equipe={equipe}
                metaTx={metaTxFracao}
                showRvDiario={showRvDiario}
                onOperadorClick={handleOperadorClick}
                onOperadorHoverStart={handleOperadorHoverStart}
                onOperadorHoverEnd={handleOperadorHoverEnd}
                headerButton={
                  nomeFantasia?.ativo && (
                    <button
                      type="button"
                      onClick={handleToggleOlho}
                      title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
                      // Mesma cor do texto do header ("Operador" e demais
                      // títulos, herdada de text-foreground em equipe-table.tsx)
                      // — antes usava text-muted-foreground/60, uma cor própria
                      // que destoava do resto do header. inline-block (não
                      // inline-flex) pra participar do fluxo de texto normal
                      // da célula e ser centralizado JUNTO com "Operador" pelo
                      // text-align:center herdado, em vez de ficar solto.
                      className="text-foreground/80 hover:text-foreground transition-colors inline-block align-middle ml-1.5"
                    >
                      {olhoAberto ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                    </button>
                  )
                }
              />
            </StyledCard>
          </div>

          {showUpload && (
            <div className="min-h-[180px] min-w-0 flex-1">
              <StyledCard withGradient className="flex h-full flex-col p-3">
                <span className="text-muted-foreground mb-3 block text-xs font-semibold uppercase tracking-wider">
                  Anexar Base
                </span>
                <div className="min-h-0 flex-1">
                  <UploadDropzone />
                </div>
              </StyledCard>
            </div>
          )}
        </div>
      </div>

      <OperadorDetalheDialog
        operador={operadorSelecionado}
        nomeExibido={operadorSelecionado ? resolverNomeOperador(operadorSelecionado) : ""}
        open={operadorDialogOpen}
        onOpenChange={setOperadorDialogOpen}
        meta={operadorMeta}
        quartil={operadorQuartil}
      />
    </motion.section>
  );
}
