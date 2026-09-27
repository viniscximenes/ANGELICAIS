"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { CopyTableButton } from "@/components/d-1/copy-table-button";
import { EquipeTable } from "@/components/d-1/equipe-table";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";
import { ConfigTabelaPopover } from "@/components/gestor/config-tabela-popover";
import { LabeledSwitch } from "@/components/gestor/labeled-switch";
import { clearConsolidadoAction } from "@/lib/d1-db/actions/clear-consolidado-action";
import { refreshConsolidadoAction } from "@/lib/d1-db/actions/refresh-consolidado-action";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
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
import { KpiLoadingScreen } from "@/components/gestor/kpi-loading-screen";

// Texto da 2ª linha do cabeçalho ("{nome} fez um report às {hora}") — mesma
// checagem de "hora ausente/zerada" de formatReportLabel (@/lib/gestor/
// format-report-label), mas com um texto mais curto: sem o "Equipe -" e sem
// o "O supervisor" na frente do nome (pedido explícito desta rodada). Mantida
// LOCAL (não uma alteração em formatReportLabel) porque essa função é
// compartilhada por outras 3 tabelas (gestor-tma-section, tempo-indisp-section)
// que continuam precisando do texto original.
// Sem report ainda (hora nula/zerada): retorna null e a linha inteira some —
// mesmo comportamento de antes (o `{formatReportLabel(...) && (...)}` já
// escondia a linha nesse caso), só que agora não há mais fallback textual
// tipo "-" ou "undefined" visível.
function formatCabecalhoReport(
  hora: string | null | undefined,
  nomeSupervisor: string | null | undefined,
): string | null {
  if (!hora || hora === "—" || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const nome = nomeSupervisor?.trim();
  if (nome) {
    return `${nome} fez um report às ${horaCurta}`;
  }
  return `Atualizado às ${horaCurta}`;
}

// Intervalo do polling: reconsulta a base a cada 30s para refletir mudanças
// sem precisar de F5. A tabela unificada Tempo Logado & Indisponibilidade
// (tempo-indisp-section.tsx) tinha o mesmo mecanismo (tabela + seção
// Analítico compartilhando o mesmo state/poll) — removido a pedido
// explícito, refetch() lá virou só manual (ClearBaseButton/popover). A
// tabela principal da TMA (gestor-tma-section.tsx) mantém o PRÓPRIO polling,
// à parte — não fazia parte dessa decisão. A seção Analítico da TMA
// (analitico-tma-tabela.tsx/cards-resumo-tma.tsx) nunca teve polling.
const POLL_INTERVAL_MS = 30_000;

// Piso mínimo (ms) da tela de loading exibida durante o refresh MANUAL
// (botão "Limpar base") — mesma lógica/duração do piso mínimo do
// carregamento inicial (ver MIN_LOADING_MS em page.tsx), só que client-side:
// se o refetch já demorou mais que isso, não espera nada extra (Math.max
// trava em 0); se voltou rápido, segura a tela de loading até completar
// MIN_REFRESH_LOADING_MS, pra não "piscar". Só cobre o refetch DISPARADO
// PELO USUÁRIO (handleBaseCleared) — o polling silencioso de 30s continua
// sem overlay nenhum, não faria sentido cobrir a tabela a cada meio minuto.
const MIN_REFRESH_LOADING_MS = 3_000;

// CAUSA RAIZ HISTÓRICA da última coluna (Tx Retenção/RV Diário) cortada: o
// wrapper VISÍVEL abaixo precisa de uma largura EXPLÍCITA (é uma `transition:
// width` em CSS, entre o estado com/sem coluna RV) que caiba o grid fixo da
// EquipeTable (BASE_COLUMN_WIDTHS_PX = 760/920px, ver equipe-table.tsx) MAIS
// o espaçamento horizontal do KpiFrame por dentro dele (`p-3`). Antes esse
// chrome era uma CONSTANTE hardcoded (26px) — frágil: qualquer mudança
// futura no frame deixaria a constante desatualizada e voltaria
// a cortar a última coluna, silenciosamente.
//
// Corrigido MEDINDO o chrome real do próprio frame renderizado
// (getComputedStyle: padding-left/right + border-left/right-width), em vez
// de uma constante — ver useCardChromePx abaixo. Se o padding do frame
// mudar de novo, a medição já
// reflete o valor novo automaticamente, sem precisar lembrar de atualizar
// nada aqui.
//
// O wrapper INVISÍVEL do PNG (mais abaixo) não precisa de nenhum desses dois
// números: por ser `position: fixed` sem `right` definido, ele já shrink-wrap
// (largura intrínseca = conteúdo real), então foi simplificado para não
// forçar largura nenhuma — o card cresce exatamente o que precisar.
function useCardChromePx(cardWrapperRef: RefObject<HTMLDivElement | null>): number {
  // Fallback (padding 12px + borda 1px, dos dois lados) usado só até a
  // primeira medição real no mount — mesmo valor que a constante antiga
  // tinha, mas agora é só um chute inicial, não a fonte de verdade.
  const [chromePx, setChromePx] = useState(26);

  useLayoutEffect(() => {
    function medir() {
      const cardEl = cardWrapperRef.current?.firstElementChild as HTMLElement | null;
      if (!cardEl) return;
      const cs = getComputedStyle(cardEl);
      const horizontal =
        parseFloat(cs.paddingLeft) +
        parseFloat(cs.paddingRight) +
        parseFloat(cs.borderLeftWidth) +
        parseFloat(cs.borderRightWidth);
      if (Number.isFinite(horizontal) && horizontal > 0) {
        setChromePx(Math.round(horizontal));
      }
    }
    medir();
    // Reagir a mudanças de padding/border por resize (ex.: breakpoints) ou
    // troca de tema, que podem em tese variar o computed style.
    const ro = new ResizeObserver(medir);
    if (cardWrapperRef.current?.firstElementChild) {
      ro.observe(cardWrapperRef.current.firstElementChild);
    }
    return () => ro.disconnect();
  }, [cardWrapperRef]);

  return chromePx;
}

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

  // Overlay de loading do refresh manual (ver MIN_REFRESH_LOADING_MS acima).
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        toast.error(result.error, { className: "reports-consolidado-toast" });
      }
    } catch (err) {
      if (!handleStaleActionError(err)) {
        console.error("[GestorEquipeSection] erro ao buscar detalhamento do operador:", err);
        toast.error("Erro ao carregar detalhamento do operador.", {
          className: "reports-consolidado-toast",
        });
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

  // "Exibir RV" (antes "RV Diário") — mesma função de sempre: liga/desliga a
  // coluna RV Diário da EquipeTable (showRvDiario), persistida por
  // toggleShowRvDiarioAction. Só o rótulo/controle visual mudou (botão pill →
  // switch, ver LabeledSwitch), pra bater com "Exibir RV" de /kpi/operadores.
  function handleToggleRvDiario(novoValor: boolean) {
    setShowRvDiario(novoValor);
    toggleShowRvDiarioAction(novoValor).catch((err) => {
      if (!handleStaleActionError(err)) {
        console.error("[GestorEquipeSection] erro ao salvar preferência de RV Diário:", err);
      }
    });
  }

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carimbo do último report conhecido (hora + nome do supervisor), pra
  // detectar barato — sem query pesada nenhuma — quando outro gestor subiu
  // uma base nova. O polling de 30s já busca esses dois campos de qualquer
  // forma pra EquipeTable; só reaproveitamos o resultado e comparamos.
  // Inicializado com os valores vindos do servidor pra não disparar um
  // notifyBaseAtualizada falso no primeiro poll após o mount.
  const lastReportSignatureRef = useRef(
    `${equipeInicial.horaReport}|${nomeSupervisorReportInicial ?? ""}`,
  );

  // Refetch usado tanto pelo polling quanto (imediatamente, sem esperar os
  // 30s) pelo ClearBaseButton — mesma fonte, dois gatilhos.
  async function refetchConsolidado() {
    try {
      const result = await refreshConsolidadoAction();
      if (result.success) {
        setOperadores(result.operadores);
        setEquipe(result.equipe);
        setNomeSupervisorReport(result.nomeSupervisorReport);

        // Base nova detectada (report mudou) — avisa a árvore irmã
        // (RetencaoDetalheSection, bloco Analítico) pra refazer sua busca
        // pesada. Sem isso, qualquer gestor que NÃO fez o upload continua
        // vendo o Analítico desatualizado até dar F5, mesmo com a
        // EquipeTable já refletindo a base nova — ver base-cleared-event.ts.
        const signature = `${result.equipe.horaReport}|${result.nomeSupervisorReport ?? ""}`;
        if (signature !== lastReportSignatureRef.current) {
          lastReportSignatureRef.current = signature;
          notifyBaseAtualizada();
        }
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
    const inicio = Date.now();
    setIsRefreshing(true);
    try {
      await refetchConsolidado();
      notifyBaseAtualizada();
    } finally {
      const faltam = MIN_REFRESH_LOADING_MS - (Date.now() - inicio);
      if (faltam > 0) {
        await new Promise((resolve) => setTimeout(resolve, faltam));
      }
      setIsRefreshing(false);
    }
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

  // Chrome (padding+borda) do StyledCard visível, medido de verdade — ver
  // comentário em useCardChromePx, acima.
  const cardVisivelWrapperRef = useRef<HTMLDivElement>(null);
  const cardChromePx = useCardChromePx(cardVisivelWrapperRef);

  return (
    <>
      {/*
        Overlay de refresh manual (ver handleBaseCleared/MIN_REFRESH_LOADING_MS
        acima) — reaproveita o MESMO esqueleto do Suspense fallback inicial
        (KpiLoadingScreen formato="consolidado"), fixo por cima da página
        inteira (z acima do header/sidebar do layout do dashboard), pra dar a
        mesma sensação de "recarregando" que o F5 já dava antes, sem de fato
        recarregar a página (preserva scroll, popovers fechados etc.).
      */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[100]">
          <KpiLoadingScreen
            dataPage="reports-consolidado"
            titulo="Consolidado"
            formato="consolidado"
            indicatorPosition="after-header"
            spinnerVariant="dots"
          />
        </div>
      )}

    {/* initial={false}: esta seção já vem pronta via SSR (props, sem fetch
        client próprio) — animar de opacity:0 com delay de 150ms fazia o
        conteúdo real ficar invisível por um intervalo perceptível logo
        depois do loading.tsx sumir (motion renderiza o estado `initial` no
        SSR; só anima pra `animate` depois que o JS hidrata), causando a
        sequência "loading → tela vazia → dados" reportada em
        /reports/consolidado. `initial={false}` faz o motion.section montar
        direto no estado final (opacity:1), sem essa janela vazia — mantém
        motion.section (em vez de trocar por <section>) só pra não precisar
        tocar em mais nada da árvore/props que dependam do elemento ser um
        motion component. */}
    <motion.section
      id="equipe-section"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        {/*
          Cabeçalho da página inteira (título "Consolidado" + linha de report)
          — movido de page.tsx (Server Component) pra cá: o texto da 2ª linha
          depende de nomeSupervisorReport/equipe.horaReport, que são estado
          client atualizado pelo polling de 30s (refetchConsolidado, abaixo),
          então só pode viver num Client Component. MESMAS classes literais
          de /kpi/operadores (KpiEquipeSection) pro título+subtítulo.
        */}
        <div className="pt-4">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Consolidado
          </h1>

          {formatCabecalhoReport(equipe.horaReport, nomeSupervisorReport) && (
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {formatCabecalhoReport(equipe.horaReport, nomeSupervisorReport)}
            </p>
          )}
        </div>

        {/*
          Controles em uma linha própria abaixo do subtítulo, seguindo a
          hierarquia de /kpi/operadores: título → subtítulo (pt-3) → controles
          (pt-4). Sem justify-between/ml-auto, para o grupo começar alinhado
          ao texto do report em vez de ficar na extrema direita da tabela.
          Ordem dos controles: [⚙ Config] [🗑 Limpar base] [Copiar imagem]
          [Exibir RV] — "Limpar base" virou ícone-only (variant="icon-danger"
          do ClearBaseButton) com o MESMO visual neutro/outline do botão de
          engrenagem, posicionado logo ao lado dela.
        */}
        <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
          <ConfigTabelaPopover
            metaTxInicial={metaTxRetencao}
            ordemInicial={ordemTabela}
            onSaved={(metaTx, ordem) => {
              setMetaTxRetencao(metaTx);
              setOrdemTabela(ordem);
            }}
            onOpenChange={setConfigPopoverOpen}
          />

          {showUpload && (
            <ClearBaseButton
              action={clearConsolidadoAction}
              onCleared={handleBaseCleared}
              variant="icon-danger"
              holdToConfirm
              toastClassName="reports-consolidado-toast"
            />
          )}

          <CopyTableButton
            operadores={operadores}
            equipe={equipe}
            supervisor={gestora}
            nomeSupervisorReport={nomeSupervisorReport}
          />

          <LabeledSwitch label="Exibir RV" checked={showRvDiario} onCheckedChange={handleToggleRvDiario} />
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
            // SEM width explícita de propósito: `position: fixed` com só
            // `top`/`left` definidos (sem `right`) faz o navegador dar
            // shrink-wrap no elemento — a largura vira a largura intrínseca
            // real do conteúdo (StyledCard + seu padding/borda reais + o
            // grid fixo de 760/920px da EquipeTable por dentro). Antes esse
            // valor era forçado por fora (760/920 + uma constante de chrome
            // hardcoded) — se o padding/borda/radius do card mudasse, a
            // constante ficava errada e cortava a última coluna
            // silenciosamente. Deixando o wrapper se auto-dimensionar, ele
            // nunca mais pode ficar mais estreito que o conteúdo real, por
            // definição — não há mais nenhum número pra desatualizar.
          }}
        >
          <div data-tabela-png>
            <KpiFrame>
              <EquipeTable
                key="gestor-equipe-png"
                operadores={operadoresPngOrdenados}
                equipe={equipe}
                metaTx={metaTxFracao}
                showRvDiario={showRvDiario}
              />
            </KpiFrame>
          </div>
        </div>

        {/*
          Sem borda/divisória aqui de propósito (removida nesta rodada) — o
          espaço entre a linha de controles e a tabela/card "Anexar Base"
          agora é só o gap vertical (pb-2 da linha acima + pt-2 daqui = 16px),
          igual ao respiro entre cabeçalho e controles (mb-4 = 16px logo
          acima), em vez do bloco antigo de 32px + linha tracejada.
        */}
        <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
          <div
            className={cn(
              "shrink-0 relative transition-[z-index] duration-0",
              configPopoverOpen && "z-[45]",
            )}
            style={{
              // Largura-base da EquipeTable (760/920px, BASE_COLUMN_WIDTHS_PX
              // em equipe-table.tsx) + o espaçamento REAL do KpiFrame,
              // medido em tempo real por useCardChromePx — nunca uma
              // constante hardcoded (ver comentário na definição do hook).
              width: showRvDiario
                ? `${920 + cardChromePx}px`
                : `${760 + cardChromePx}px`,
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
            <div ref={cardVisivelWrapperRef} className="h-full">
              <KpiFrame className="h-full">
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
                        aria-pressed={olhoAberto}
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
              </KpiFrame>
            </div>
          </div>

          {showUpload && (
            <div className="min-h-[180px] min-w-0 flex-1 self-stretch">
              <UploadDropzone />
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
    </>
  );
}
