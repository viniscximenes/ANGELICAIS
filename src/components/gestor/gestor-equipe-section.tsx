"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { toast } from "sonner";

import { CopyTableButton } from "@/components/d-1/copy-table-button";
import { EquipeTable, formatOperatorLabel } from "@/components/d-1/equipe-table";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { LimparBaseExpandButton } from "@/components/d-1/limpar-base-expand-button";
import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { ConfigTabelaPopover } from "@/components/gestor/config-tabela-popover";
import { LabeledSwitch } from "@/components/gestor/labeled-switch";
import { clearConsolidadoAction } from "@/lib/d1-db/actions/clear-consolidado-action";
import { refreshConsolidadoAction } from "@/lib/d1-db/actions/refresh-consolidado-action";
import { separarVersaoConsolidado } from "@/lib/d1-db/versao-consolidado";
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
import { useSetasRolagem } from "@/lib/lenis/use-setas-rolagem";
import { formatCabecalhoReport } from "@/lib/gestor/format-cabecalho-report";
import { fetchOperadorDetalheAction } from "@/lib/retencao/actions";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";
import { OperadorDetalheDialog } from "@/components/dashboard/retencao/operador-detalhe-dialog-lazy";
import { notifyBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import {
  DEFAULT_THEME_METAS,
  lerThemeMetasLegado,
  limparThemeMetasLegado,
  notifyMetasAtualizadas,
} from "@/lib/retencao/metas-consolidado";
import {
  COOKIE_LINHAS,
  COOKIE_RV,
  ConsolidadoSkeleton,
} from "@/app/(dashboard)/s/reports/consolidado/consolidado-skeleton";
import { CursorCarregando } from "@/components/gestor/cursor-carregando";

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
//
// DECISÃO DE PRODUTO (não é falha de desempenho): piso pedido pelo usuário,
// mantido nas auditorias de 2026-10-07. Só afeta o overlay do "Limpar Base"
// — a limpeza no banco e o refetch não esperam por ele. Não remover sem
// pedido explícito.
const MIN_REFRESH_LOADING_MS = 1_000;

/** Classe dos toasts desta rota (ver .reports-consolidado-toast no CSS). */
const TOAST_CLASS = "reports-consolidado-toast";

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
  /** profiles.id do gestor — escopo da leitura de transição das metas por tema. */
  gestorId: string;
  /** Metas por tema do banco (getConfigTabela). null = nunca salvou. */
  metasTemasIniciais?: Record<string, number> | null;
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  /** Mostra a área de upload da base (gated por manage_d1_base na página). */
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  /** Nome do supervisor que fez o último report (BASE - 1!S2, junto com a hora). */
  nomeSupervisorReport?: string | null;
  /** Dias (YYYY-MM-DD) da base do último upload — d1_consolidado.report_datas_base. */
  datasBaseReport?: string[] | null;
  /** Versão dos dados vinda do servidor — o polling só busca tudo de novo quando ela muda. */
  versaoInicial?: string;
  /** Meta de TX Retenção (%, escala 0-100) — config do gestor, `gestor_config_fantasia.meta_tx_retencao`. */
  metaTxInicial?: number;
  /** Ordenação salva da tabela — `gestor_config_fantasia.ordem_tabela`. */
  ordemTabelaInicial?: OrdemTabela;
  /** Toggle "RV Diário" salvo — `gestor_config_fantasia.show_rv_diario`. */
  showRvDiarioInicial?: boolean;
}

export function GestorEquipeSection({
  gestorId,
  metasTemasIniciais = null,
  operadores: operadoresIniciais,
  equipe: equipeInicial,
  showUpload = false,
  nomeFantasia: nomeFantasiaInicial,
  olhoInicial = false,
  nomeSupervisorReport: nomeSupervisorReportInicial = null,
  datasBaseReport: datasBaseReportInicial = null,
  versaoInicial = "",
  metaTxInicial = DEFAULT_META_TX_RETENCAO,
  ordemTabelaInicial = DEFAULT_ORDEM_TABELA,
  showRvDiarioInicial = DEFAULT_SHOW_RV_DIARIO,
}: GestorEquipeSectionProps) {
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [operadores, setOperadores] = useState(operadoresIniciais);
  const [equipe, setEquipe] = useState(equipeInicial);
  // Config de nome fantasia — atualizada pelo polling (refreshConsolidadoAction)
  // junto com os nomes, pra o botão do olho acompanhar quando o recurso é
  // ligado/desligado em outra aba.
  const [nomeFantasia, setNomeFantasia] = useState(nomeFantasiaInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(
    nomeSupervisorReportInicial,
  );
  const [datasBaseReport, setDatasBaseReport] = useState(datasBaseReportInicial);
  const [metaTxRetencao, setMetaTxRetencao] = useState(metaTxInicial);
  const [ordemTabela, setOrdemTabela] = useState(ordemTabelaInicial);
  // Metas por tema — do banco (meta_temas), editadas no ConfigTabelaPopover.
  // Nunca salvas no banco: vale o que o gestor tinha no navegador (leitura
  // de transição, só depois do mount — no SSR não existe storage).
  const [themeMetas, setThemeMetas] = useState<Record<string, number>>(
    metasTemasIniciais ?? DEFAULT_THEME_METAS,
  );
  useEffect(() => {
    if (metasTemasIniciais === null) setThemeMetas(lerThemeMetasLegado(gestorId));
  }, [gestorId, metasTemasIniciais]);
  // Espelha o open/close do ConfigTabelaPopover só pra elevar a tabela acima
  // do overlay de blur (z-40) enquanto o popover está aberto.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  // rvDiario já vem calculado do servidor pra todo mundo, então ligar/desligar
  // não dispara fetch de dados — só persiste a preferência (upsert parcial,
  // mesmo padrão do handleToggleOlho).
  const [showRvDiario, setShowRvDiario] = useState(showRvDiarioInicial);

  // Overlay de loading do refresh manual (ver MIN_REFRESH_LOADING_MS acima).
  const [isRefreshing, setIsRefreshing] = useState(false);
  // "Limpando..." do botão Limpar Base: só enquanto a action roda no
  // servidor — dali em diante quem mostra o carregamento é o esqueleto.
  const [limpandoBase, setLimpandoBase] = useState(false);

  // Detalhamento individual do operador (clique no nome da EquipeTable) —
  // busca no clique via fetchOperadorDetalheAction (retencao_atendimentos,
  // calcula a equipe inteira e devolve o operador), à parte do Analítico
  // (que carrega no mount da página). Antes vivia dentro do card
  // "Operadores" do trilho horizontal; migrado pra cá quando esse card foi
  // removido (o dado já estava disponível ali, agora é buscado no clique).
  const [operadorSelecionado, setOperadorSelecionado] = useState<OperadorIndividual | null>(null);
  const [operadorSelecionadoEmail, setOperadorSelecionadoEmail] = useState<string | null>(null);
  const [operadorQuartil, setOperadorQuartil] = useState<QuartilOperador | null>(null);
  const [operadorMeta, setOperadorMeta] = useState(DEFAULT_META_TX_RETENCAO);
  const [operadorDialogOpen, setOperadorDialogOpen] = useState(false);
  const [operadorDialogLoading, setOperadorDialogLoading] = useState(false);
  // Onde o clique na linha aconteceu — ponto de partida do cursor de
  // carregamento customizado (CursorCarregando), antes do 1º movimento.
  const [posicaoClique, setPosicaoClique] = useState<{ x: number; y: number } | null>(null);

  async function handleOperadorClick(emailOriginal: string) {
    if (operadorDialogLoading) return;
    setOperadorDialogLoading(true);
    try {
      const result = await fetchOperadorDetalheAction(emailOriginal);
      if (result.success) {
        setOperadorSelecionado(result.data.operador);
        setOperadorSelecionadoEmail(emailOriginal);
        setOperadorQuartil(result.data.quartil);
        setOperadorMeta(result.data.meta);
        setOperadorDialogOpen(true);
      } else {
        toast.error(result.error, { className: TOAST_CLASS });
      }
    } catch (err) {
      if (!handleStaleActionError(err)) {
        console.error("[GestorEquipeSection] erro ao buscar detalhamento do operador:", err);
        toast.error("Erro ao carregar detalhamento do operador.", {
          className: TOAST_CLASS,
        });
      }
    } finally {
      setOperadorDialogLoading(false);
    }
  }


  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    // A action devolve { success: false } em vez de lançar — sem checar isso a
    // tela ficava com o valor novo e o banco com o antigo (volta no F5).
    toggleOlhoAction("consolidado", novoValor)
      .then((r) => {
        if (!r.success) {
          setOlhoAberto(!novoValor);
          toast.error("Não foi possível salvar a preferência", { className: TOAST_CLASS });
        }
      })
      .catch((err) => {
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
    // Mesmo cuidado do handleToggleOlho: { success: false } desfaz o toggle.
    toggleShowRvDiarioAction(novoValor)
      .then((r) => {
        if (!r.success) {
          setShowRvDiario(!novoValor);
          toast.error("Não foi possível salvar a preferência", { className: TOAST_CLASS });
        }
      })
      .catch((err) => {
        if (!handleStaleActionError(err)) {
          console.error("[GestorEquipeSection] erro ao salvar preferência de RV Diário:", err);
        }
      });
  }

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Build antigo detectado (handleStaleActionError): não volta a consultar
  // nem quando a aba volta a ficar visível.
  const pararPollingRef = useRef(false);

  // Versão da BASE (roster + linhas + último updated_at de d1_consolidado)
  // do último dado conhecido, pra detectar quando outro gestor subiu uma
  // base nova. Antes comparava "hora|autor" do report — hora em HH:MM, então
  // dois uploads do mesmo autor no mesmo minuto não avisavam o Analítico.
  // Inicializada com a versão vinda do servidor pra não disparar um
  // notifyBaseAtualizada falso no primeiro poll após o mount.
  const lastVersaoBaseRef = useRef(separarVersaoConsolidado(versaoInicial).base ?? "");

  // Evita duas buscas sobrepostas (polling + volta da aba + "Limpar base").
  const refetchEmVooRef = useRef<Promise<boolean> | null>(null);

  // Versão dos dados que a tela mostra (ver getGestorConsolidado). Vai em
  // cada poll: se o servidor achar a mesma, responde "sem mudança" sem
  // refazer as consultas pesadas, e nada na tela é atualizado.
  const versaoRef = useRef(versaoInicial);

  const buscarConsolidado = useCallback(async (): Promise<boolean> => {
    try {
      const result = await refreshConsolidadoAction(versaoRef.current);
      if (result.success && result.semMudanca) return false;
      if (result.success) {
        versaoRef.current = result.versao;
        setOperadores(result.operadores);
        setEquipe(result.equipe);
        setNomeSupervisorReport(result.nomeSupervisorReport);
        setDatasBaseReport(result.datasBaseReport);
        setNomeFantasia(result.nomeFantasia);

        // Base nova detectada (versão da base mudou) — avisa a árvore irmã
        // (RetencaoDetalheSection, bloco Analítico) pra refazer sua busca
        // pesada. Sem isso, qualquer gestor que NÃO fez o upload continua
        // vendo o Analítico desatualizado até dar F5, mesmo com a
        // EquipeTable já refletindo a base nova — ver base-cleared-event.ts.
        // Mudança só de nome fantasia/RV não muda a base: não recarrega.
        if (result.versaoBase !== lastVersaoBaseRef.current) {
          lastVersaoBaseRef.current = result.versaoBase;
          notifyBaseAtualizada();
          return true;
        }
      }
      return false;
    } catch (err) {
      // Server Action de um build anterior (hot reload em dev, ou deploy
      // novo em produção com a aba aberta): avisa o usuário uma única vez e
      // para o polling, em vez de repetir a mesma falha a cada 30s pra sempre.
      if (handleStaleActionError(err)) {
        pararPollingRef.current = true;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return false;
      }
      console.error("[GestorEquipeSection] erro ao atualizar consolidado (polling):", err);
      return false;
    }
  }, []);

  // Refetch usado tanto pelo polling quanto (imediatamente, sem esperar os
  // 30s) pelo "Limpar Base" — mesma fonte, dois gatilhos.
  // Retorna true quando já avisou o Analítico (report mudou), pra quem chamou
  // não avisar de novo.
  //
  // `depoisDaBuscaEmVoo`: usado pelo "Limpar Base". Uma busca do polling que
  // já estava em voo começou ANTES da limpeza e traria os dados antigos —
  // reaproveitá-la deixava a tabela com os números de antes até o próximo
  // poll. Nesse caso espera ela terminar e faz uma busca nova.
  const refetchConsolidado = useCallback(
    (depoisDaBuscaEmVoo = false): Promise<boolean> => {
      const iniciar = (): Promise<boolean> => {
        if (!refetchEmVooRef.current) {
          refetchEmVooRef.current = buscarConsolidado().finally(() => {
            refetchEmVooRef.current = null;
          });
        }
        return refetchEmVooRef.current;
      };
      const emVoo = refetchEmVooRef.current;
      if (depoisDaBuscaEmVoo && emVoo) return emVoo.then(iniciar);
      return iniciar();
    },
    [buscarConsolidado],
  );

  // Handler específico do "Limpar Base" (não reaproveitado pelo polling):
  // além de recarregar a EquipeTable (mesmo refetch de sempre), avisa a
  // árvore irmã (RetencaoDetalheSection, bloco analítico) que
  // retencao_atendimentos também foi esvaziada — clearConsolidadoAction já
  // limpa as duas tabelas no mesmo clique, mas cada seção busca seus dados
  // de forma independente, então cada lado precisa do próprio refetch.
  // Botão "Limpar Base" direto aqui (antes via ClearBaseButton, que trazia
  // junto HoldButton/Tooltip das variantes de outras páginas). Sem toast de
  // sucesso e sem router.refresh(): o esqueleto já comunica a ação e
  // handleBaseCleared recarrega tabela e Analítico.
  async function handleLimparBase() {
    setLimpandoBase(true);
    try {
      const r = await clearConsolidadoAction().finally(() => setLimpandoBase(false));
      if (r.success) {
        await handleBaseCleared();
      } else {
        toast.error(r.error, { className: TOAST_CLASS });
      }
    } catch (err) {
      if (handleStaleActionError(err)) return;
      toast.error("Erro inesperado ao limpar a base", { className: TOAST_CLASS });
      console.error("[GestorEquipeSection] erro ao limpar a base:", err);
    }
  }

  async function handleBaseCleared() {
    const inicio = Date.now();
    setIsRefreshing(true);
    try {
      // Só avisa o Analítico se o refetch ainda não avisou (report mudou) —
      // antes avisava sempre, e o Analítico recarregava duas vezes.
      const jaAvisou = await refetchConsolidado(true);
      if (!jaAvisou) notifyBaseAtualizada();
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
  // Com a aba em segundo plano não consulta; ao voltar, atualiza na hora.
  useEffect(() => {
    function atualizarSeVisivel() {
      if (document.visibilityState === "visible" && !pararPollingRef.current) {
        void refetchConsolidado();
      }
    }
    pollIntervalRef.current = setInterval(atualizarSeVisivel, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", atualizarSeVisivel);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener("visibilitychange", atualizarSeVisivel);
    };
  }, [refetchConsolidado]);

  // Setas Cima/Baixo rolam a página (ver use-setas-rolagem.ts).
  useSetasRolagem();

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
  // Nome do dialog = o MESMO da linha clicada na tabela da tela (respeita o
  // olho: fantasia com ele fechado, nome real com ele aberto). A imagem do
  // "Copiar imagem" continua sempre com o nome fantasia (operadoresPngOrdenados).
  const nomeOperadorSelecionado = useMemo(() => {
    if (!operadorSelecionado) return "";
    const linha = operadoresParaTela.find(
      (op) => (op.emailOriginal ?? op.email) === operadorSelecionadoEmail,
    );
    return formatOperatorLabel(linha?.email ?? operadorSelecionado.login);
  }, [operadorSelecionado, operadorSelecionadoEmail, operadoresParaTela]);

  const operadoresOrdenados = useMemo(
    () => ordenarOperadores(operadoresParaTela, ordemTabela),
    [operadoresParaTela, ordemTabela],
  );
  // Tabela oculta do "Copiar imagem" sob demanda (ver o wrapper no JSX):
  // monta com ponteiro em cima/foco no botão e desmonta quando os dois saem
  // e não há captura em andamento — antes ficava montada até sair da página,
  // recebendo toda atualização depois de um simples hover no botão.
  const [tabelaPngMontada, setTabelaPngMontada] = useState(false);
  const pngPonteiroRef = useRef(false);
  const pngFocoRef = useRef(false);
  const pngCapturandoRef = useRef(false);
  const desmontarTabelaPngSePossivel = useCallback(() => {
    if (!pngPonteiroRef.current && !pngFocoRef.current && !pngCapturandoRef.current) {
      setTabelaPngMontada(false);
    }
  }, []);
  const pngHandlers = useMemo(
    () => ({
      onPointerOver: () => {
        pngPonteiroRef.current = true;
        setTabelaPngMontada(true);
      },
      onPointerLeave: () => {
        pngPonteiroRef.current = false;
        desmontarTabelaPngSePossivel();
      },
      onFocus: () => {
        pngFocoRef.current = true;
        setTabelaPngMontada(true);
      },
      onBlur: () => {
        pngFocoRef.current = false;
        desmontarTabelaPngSePossivel();
      },
      // Captura: o clique sempre vem depois do hover/foco (tabela já montada).
      onClickCapture: () => {
        pngCapturandoRef.current = true;
      },
    }),
    [desmontarTabelaPngSePossivel],
  );
  const handleCapturaPngFim = useCallback(() => {
    pngCapturandoRef.current = false;
    desmontarTabelaPngSePossivel();
  }, [desmontarTabelaPngSePossivel]);

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

  // Rolagem horizontal da tabela também no desktop, mas SÓ quando ela não
  // cabe (auditoria 2026-10-07: entre ~1024 e 1100px de janela, ou até
  // ~1250px com RV aberto, o card era cortado sem rolagem). Mede a linha que
  // contém o card; quando cabe, nada muda — inclusive a animação do toggle
  // RV, que não pode ganhar barra de rolagem no meio. Abaixo de lg a rolagem
  // continua sempre ligada, como antes.
  const cardExternoRef = useRef<HTMLDivElement>(null);
  const [tabelaNaoCabe, setTabelaNaoCabe] = useState(false);
  const larguraTabelaPx = (showRvDiario ? 920 : 760) + cardChromePx;
  useEffect(() => {
    const linha = cardExternoRef.current?.parentElement;
    if (!linha) return;
    const medir = () => setTabelaNaoCabe(linha.clientWidth < larguraTabelaPx);
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(linha);
    return () => observer.disconnect();
  }, [larguraTabelaPx]);

  // Guarda o nº de operadores pro esqueleto do próximo carregamento
  // (loading.tsx lê no servidor) ter a mesma altura da tabela real.
  useEffect(() => {
    document.cookie = `${COOKIE_LINHAS}=${operadores.length}; path=/; max-age=31536000; samesite=lax`;
  }, [operadores.length]);

  // Idem para a coluna RV: o esqueleto do próximo carregamento sai com a
  // mesma largura da tabela real (784px fechado / 944px aberto).
  useEffect(() => {
    document.cookie = `${COOKIE_RV}=${showRvDiario ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }, [showRvDiario]);

  const textoReport = formatCabecalhoReport(equipe.horaReport, nomeSupervisorReport, datasBaseReport);

  return (
    <>
      {/*
        Overlay de refresh manual (ver handleBaseCleared/MIN_REFRESH_LOADING_MS
        acima) — reaproveita o MESMO esqueleto do Suspense fallback inicial
        (ConsolidadoSkeleton, de loading.tsx — o do F5), fixo por cima só da área de
        CONTEÚDO (abaixo do header de 60px, à direita da sidebar de 240px em
        telas lg+) — pra dar a mesma sensação de "recarregando" que um F5
        real dá (loading.tsx do Next só substitui {children} dentro de
        <main>, header/sidebar do layout continuam visíveis), sem de fato
        recarregar a página (preserva scroll, popovers fechados etc.). Cobrir
        a página INTEIRA (inset-0) escondia a sidebar durante o refresh,
        diferente de um F5 normal.
      */}
      {isRefreshing && (
        // overflow-hidden: o esqueleto (min-h-screen) passa da área visível —
        // corta em vez de abrir rolagem dentro do overlay.
        // mb-0: este overlay é filho do `space-y-10` de page.tsx, que dá
        // margin-bottom: 40px aos filhos — num elemento fixed com top/bottom,
        // essa margem encurtava o overlay e os últimos 40px da tela mostravam
        // a tabela real por baixo do skeleton.
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] !mb-0 overflow-hidden lg:left-[240px]">
          <ConsolidadoSkeleton linhas={operadores.length} rvAberto={showRvDiario} />
        </div>
      )}

    {/* <section> simples (antes motion.section com initial={false}, que não
        animava nada): o conteúdo já vem pronto via SSR, sem fade de entrada
        — ver a sequência "loading → tela vazia → dados" em page.tsx. */}
    <section id="equipe-section" className="space-y-4">
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

          {textoReport && (
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal whitespace-pre-wrap">
              {textoReport}
            </p>
          )}
        </div>

        {/*
          Controles em uma linha própria abaixo do subtítulo, seguindo a
          hierarquia de /kpi/operadores: título → subtítulo (pt-3) → controles
          (pt-4). Sem justify-between/ml-auto, para o grupo começar alinhado
          ao texto do report em vez de ficar na extrema direita da tabela.
          Ordem dos controles: [⚙ Config] [🗑 Limpar base] [Copiar imagem]
          [Exibir RV] — "Limpar base" (LimparBaseExpandButton) em repouso tem
          o MESMO visual neutro/outline do botão de engrenagem, logo ao lado
          dela.
        */}
        <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
          <ConfigTabelaPopover
            metaTxInicial={metaTxRetencao}
            ordemInicial={ordemTabela}
            themeMetasInicial={themeMetas}
            onSaved={(metaTx, ordem, novasThemeMetas) => {
              setMetaTxRetencao(metaTx);
              setOrdemTabela(ordem);
              setThemeMetas(novasThemeMetas);
              // Já gravadas no banco pela action — a cópia local sai.
              limparThemeMetasLegado(gestorId);
              // A meta geral agora é a mesma na tabela e no Analítico.
              notifyMetasAtualizadas({ metaGlobal: metaTx, themeMetas: novasThemeMetas });
            }}
            onOpenChange={setConfigPopoverOpen}
          />

          {showUpload && (
            <LimparBaseExpandButton onConfirm={handleLimparBase} pending={limpandoBase} />
          )}

          {/* display:contents — não muda o layout da linha de controles.
              Ponteiro em cima ou foco no botão monta a tabela oculta do PNG
              (ver tabelaPngMontada); o clique vem sempre depois disso. */}
          <span className="contents" {...pngHandlers}>
            <CopyTableButton equipe={equipe} onCapturaFim={handleCapturaPngFim}
            />
          </span>

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
          Só montado enquanto o ponteiro/foco está no "Copiar imagem" ou uma
          captura está em andamento (ver pngHandlers) — antes era uma 2ª
          tabela inteira no DOM o tempo todo, re-renderizando a cada poll e
          animação.
        */}
        {tabelaPngMontada && (
          <div
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
        )}

        {/*
          Sem borda/divisória aqui de propósito (removida nesta rodada) — o
          espaço entre a linha de controles e a tabela/card "Anexar Base"
          agora é só o gap vertical (pb-2 da linha acima + pt-2 daqui = 16px),
          igual ao respiro entre cabeçalho e controles (mb-4 = 16px logo
          acima), em vez do bloco antigo de 32px + linha tracejada.
        */}
        {/* lg:flex-wrap + anexo com mínimo de 260px: em desktop estreito
            (ou com RV aberto), quando não sobra espaço ao lado da tabela o
            anexo desce para a linha de baixo em largura cheia (empilhado) —
            antes ficava com largura zero ao lado. Com espaço, nada muda. */}
        <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:flex-wrap lg:items-stretch">
          <div
            ref={cardExternoRef}
            className={cn(
              "shrink-0 relative transition-[z-index] duration-0",
              // bg-background junto com o z-[45]: KpiFrame não tem fundo
              // próprio (só cantoneiras) e as linhas da EquipeTable são
              // transparentes — sem isso, acima do overlay só o cabeçalho
              // (fundo sólido) ficava nítido e as linhas mostravam o blur
              // por trás delas.
              configPopoverOpen && "z-[45] bg-background",
            )}
            // Busca do detalhe do operador em andamento: no lugar do cursor
            // de espera do sistema (bolinha azul), o CursorCarregando abaixo.
            aria-busy={operadorDialogLoading || undefined}
            onPointerDownCapture={(e) => setPosicaoClique({ x: e.clientX, y: e.clientY })}
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
            {/*
              Abaixo de lg (celular/tablet em pé) a tabela tem largura fixa
              de 760/920px e não cabe: antes as colunas da direita (Tx, RV)
              eram cortadas sem rolagem. Agora o card acompanha a largura
              real da tabela (w-max) e esta caixa rola na horizontal. No
              desktop, só quando a tabela não cabe (tabelaNaoCabe) — com
              espaço sobrando nada muda (a animação de largura do toggle RV
              não pode ganhar barra de rolagem no meio).
            */}
            <div
              ref={cardVisivelWrapperRef}
              className={cn("h-full max-lg:overflow-x-auto", tabelaNaoCabe && "overflow-x-auto")}
            >
              <KpiFrame
                className={cn("h-full max-lg:w-max max-lg:min-w-full", tabelaNaoCabe && "w-max min-w-full")}
              >
                <EquipeTable
                  key="gestor-equipe-visible"
                  operadores={operadoresOrdenados}
                  equipe={equipe}
                  metaTx={metaTxFracao}
                  showRvDiario={showRvDiario}
                  onOperadorClick={handleOperadorClick}
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
            <div className="min-h-[180px] min-w-0 flex-1 self-stretch lg:min-w-[260px]">
              <UploadDropzone abrirEmDownloads recarregarComModalAberto />
            </div>
          )}
        </div>
      </div>

      {operadorDialogLoading && <CursorCarregando inicial={posicaoClique} />}

      <OperadorDetalheDialog
        operador={operadorSelecionado}
        nomeExibido={nomeOperadorSelecionado}
        open={operadorDialogOpen}
        onOpenChange={setOperadorDialogOpen}
        meta={operadorMeta}
        quartil={operadorQuartil}
        visualNeumorfico
        graficoNovo
      />
    </section>
    </>
  );
}
