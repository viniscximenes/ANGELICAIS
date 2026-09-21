"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

import { UploadTempoLogadoDropzone } from "@/components/d-1/tempo-logado/upload-tempo-logado-dropzone";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { AguardandoDadosCard } from "@/components/gestor/aguardando-dados-card";
import { StyledCard } from "@/components/gestor/styled-card";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";
import {
  buildForecastPorOperador,
  calcularAderenciaOperador,
} from "@/lib/d1-db/calcular-aderencia";
import { clearTempoLogadoAction } from "@/lib/d1-db/actions/clear-tempo-logado-action";
import { refreshIndisponibilidadeAction } from "@/lib/d1-db/actions/refresh-indisponibilidade-action";
import { refreshTempoLogadoAction } from "@/lib/d1-db/actions/refresh-tempo-logado-action";
import type { GestorIndispLinha, GestorTempoLogadoLinha } from "@/lib/d1-db/types";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { formatReportLabel } from "@/lib/gestor/format-report-label";
import { ordenarOperadoresTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/ordenar-operadores-tempo-indisp";
import type { OrdemTabelaTempoIndisp } from "@/lib/gestor/config-tabela-tempo-indisp/types";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { toggleOlhoAction } from "@/lib/gestor/nome-fantasia/toggle-olho-action";
import { cn } from "@/lib/utils";

import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";

import { AderenciaAnalitico } from "./aderencia-analitico";
import { CardsResumoAnalitico } from "./cards-resumo-analitico";
import { ConfigTabelaTempoIndispPopover } from "./config-tabela-tempo-indisp-popover";
import { CopyTempoIndispButton } from "./copy-tempo-indisp-button";
import { EstouroPausaAnalitico } from "./estouro-pausa-analitico";
import { mergeOperadoresTempoIndisp, type OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";
import { OperadorAnaliticoDialog } from "./operador-analitico-dialog";
import { PausasDetalhadasAnalitico } from "./pausas-detalhadas-analitico";
import { PausasNaoRealizadasAnalitico } from "./pausas-nao-realizadas-analitico";
import { TEMPO_INDISP_TABELA_WIDTH_PX, TempoIndispTabela } from "./tempo-indisp-tabela";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Reconsulta d1_tempo_logado + d1_indisponibilidade a cada 30s, sem F5 — um
// único intervalo pros dois datasets (antes eram dois pollings separados,
// um por seção/página).
const POLL_INTERVAL_MS = 30_000;

interface TempoIndispSectionProps {
  operadoresTempoLogadoIniciais: GestorTempoLogadoLinha[];
  operadoresIndisponibilidadeIniciais: GestorIndispLinha[];
  horaReportInicial: string | null;
  nomeSupervisorReportInicial?: string | null;
  pausasProgramadas: PausaProgramadaDb[];
  toleranciaMin: number;
  /** Mostra a área de upload/limpeza da base (gated por manage_d1_base na página). */
  showUpload?: boolean;
  nomeFantasia?: NomeFantasiaSerial;
  olhoInicial?: boolean;
  metaIndisponibilidadeInicial: number;
  ordemTabelaInicial: OrdemTabelaTempoIndisp;
}

export function TempoIndispSection({
  operadoresTempoLogadoIniciais,
  operadoresIndisponibilidadeIniciais,
  horaReportInicial,
  nomeSupervisorReportInicial = null,
  pausasProgramadas,
  toleranciaMin,
  showUpload = false,
  nomeFantasia,
  olhoInicial = false,
  metaIndisponibilidadeInicial,
  ordemTabelaInicial,
}: TempoIndispSectionProps) {
  const [operadoresTL, setOperadoresTL] = useState(operadoresTempoLogadoIniciais);
  const [operadoresIndisp, setOperadoresIndisp] = useState(operadoresIndisponibilidadeIniciais);
  // Antes eram só props (do SSR de page.tsx), nunca atualizadas pelo
  // polling de 30s — buildForecastPorOperador/calcularAderenciaOperador
  // (usados pela Aderência e pelos cards analíticos novos) ficavam presos
  // no valor do primeiro carregamento da página. Viram state, atualizado
  // em refetch() (abaixo) — reaproveita o MESMO polling já existente, sem
  // criar nenhum setInterval novo.
  const [pausasProgramadasState, setPausasProgramadas] = useState(pausasProgramadas);
  const [toleranciaMinState, setToleranciaMin] = useState(toleranciaMin);
  const [horaReport, setHoraReport] = useState(horaReportInicial);
  const [nomeSupervisorReport, setNomeSupervisorReport] = useState(nomeSupervisorReportInicial);
  const [olhoAberto, setOlhoAberto] = useState(olhoInicial);
  const [metaIndisponibilidade, setMetaIndisponibilidade] = useState(metaIndisponibilidadeInicial);
  const [ordemTabela, setOrdemTabela] = useState<OrdemTabelaTempoIndisp>(ordemTabelaInicial);
  // Espelha o open/close do ConfigTabelaTempoIndispPopover só pra elevar a
  // tabela acima do overlay de blur (z-40) enquanto o popover está aberto —
  // mesmo padrão de configPopoverOpen em GestorEquipeSection.
  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);

  const [selecionado, setSelecionado] = useState<OperadorAnaliticoTempoIndisp | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleToggleOlho() {
    const novoValor = !olhoAberto;
    setOlhoAberto(novoValor);
    void toggleOlhoAction("tempo_indisponibilidade", novoValor);
  }

  // Refetch usado tanto pelo polling quanto (imediatamente, sem esperar os
  // 30s) pelo ClearBaseButton — mesma fonte, dois gatilhos. Repassa a meta
  // ATUAL (estado) pro refresh recalcular cumpriuMeta com o valor
  // configurado, não com o default — ver comentário em
  // refreshIndisponibilidadeAction.
  // Ref (não state) pra `refetch` sempre ler a meta ATUAL sem precisar
  // entrar nas deps do useEffect do polling abaixo — closure de state
  // direto ficaria obsoleta (o setInterval de `[]` só vê o valor do
  // PRIMEIRO render); com o ref, o mesmo padrão `useEffect(..., [])` de
  // GestorEquipeSection (consolidado) continua funcionando sem recriar o
  // interval a cada mudança de meta.
  const metaIndisponibilidadeRef = useRef(metaIndisponibilidade);
  useEffect(() => {
    metaIndisponibilidadeRef.current = metaIndisponibilidade;
  }, [metaIndisponibilidade]);

  // `metaOverride` existe só pro chamado logo após salvar uma meta nova na
  // engrenagem: nesse ponto nem o state nem o ref ainda refletem o valor
  // novo (setState é assíncrono, o ref só atualiza no efeito acima).
  // Passar o valor recém-salvo direto evita esse 1 render de atraso.
  async function refetch(metaOverride?: number) {
    const [tlResult, indispResult] = await Promise.all([
      refreshTempoLogadoAction(),
      refreshIndisponibilidadeAction(metaOverride ?? metaIndisponibilidadeRef.current),
    ]);
    if (tlResult.success) {
      setOperadoresTL(tlResult.operadores);
      setHoraReport(tlResult.horaReport);
      setNomeSupervisorReport(tlResult.nomeSupervisorReport);
    }
    if (indispResult.success) {
      setOperadoresIndisp(indispResult.operadores);
      setPausasProgramadas(indispResult.pausasProgramadas);
      setToleranciaMin(indispResult.toleranciaMin);
    }
  }

  useEffect(() => {
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const operadoresMergedBrutos = mergeOperadoresTempoIndisp(operadoresTL, operadoresIndisp);
  const operadoresMerged = ordenarOperadoresTempoIndisp(operadoresMergedBrutos, ordemTabela);

  const hasDados = operadoresMerged.some(
    (op) => op.tempoLogadoSegundos > 0 || op.indisponibilidade !== null,
  );

  const forecastPorOperador = useMemo(
    () => buildForecastPorOperador(pausasProgramadasState),
    [pausasProgramadasState],
  );

  function abrirDialog(op: OperadorAnaliticoTempoIndisp) {
    setSelecionado(op);
    setDialogOpen(true);
  }

  const aderenciaSelecionado = selecionado
    ? calcularAderenciaOperador(
        selecionado.email,
        {
          login: selecionado.horaLogin,
          pausa10Primeira: selecionado.pausa10PrimeiraHora,
          pausa20: selecionado.pausa20Hora,
          pausa10Segunda: selecionado.pausa10SegundaHora,
        },
        forecastPorOperador,
        toleranciaMinState,
      )
    : { forecast: null, items: [], percentualTotal: null };

  return (
    <motion.section
      id="tempo-indisp-section"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-4"
    >
      {/*
        Título + divisória + conteúdo, todos dentro de UMA <div> (sem
        space-y própria) — mesma estrutura de GestorEquipeSection no
        consolidado. Precisa ser um wrapper só: o space-y-4 do
        motion.section pai soma margin-top a cada FILHO DIRETO dele, então
        se a linha de título e o wrapper de conteúdo fossem filhos diretos
        separados, o space-y-4 somaria em cima do pt-4 do conteúdo,
        dobrando o respiro. Com os dois dentro desta <div>, o motion.section
        só vê um filho aqui (mais o dialog, sem layout) e o espaçamento fica
        só o que os paddings pb-4/pt-4 definem.
      */}
      <div>
        {/*
          pt-0 (não py-4 nos dois lados): o espaço ACIMA do título "Equipe"
          já vem do mb-4 do <header> da página (page.tsx) — mesmo padrão de
          GestorEquipeSection no consolidado. Somar padding próprio aqui em
          cima criaria um vazio duplicado entre o cabeçalho da página e este
          título.
        */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-0 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="ds-h2">Equipe</h2>
            {formatReportLabel(horaReport, nomeSupervisorReport) && (
              <span className="ds-mono-sm text-foreground/80 font-medium">
                - {formatReportLabel(horaReport, nomeSupervisorReport)}
              </span>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <CopyTempoIndispButton horaReport={horaReport ?? "—"} />
            {showUpload && (
              <ClearBaseButton action={clearTempoLogadoAction} onCleared={refetch} />
            )}
            <ConfigTabelaTempoIndispPopover
              metaIndisponibilidadeInicial={metaIndisponibilidade}
              ordemInicial={ordemTabela}
              onSaved={(meta, ordem) => {
                setMetaIndisponibilidade(meta);
                setOrdemTabela(ordem);
                // Refetch imediato com a meta recém-salva (metaOverride):
                // cumpriuMeta é recalculado no servidor
                // (get-gestor-indisponibilidade.ts), não no client — sem
                // isso, a cor da linha/o card "dentro da meta" só
                // refletiriam a meta nova no próximo poll de 30s.
                void refetch(meta);
              }}
              onOpenChange={setConfigPopoverOpen}
            />
          </div>
        </div>

        {/*
          Divisória sob o título + conteúdo — mesma estrutura de
          GestorEquipeSection no consolidado: border-t border-dashed
          border-border pt-4 (não é um <hr>, é a borda superior deste
          wrapper). O respiro ACIMA da linha vem do pb-4 da linha de título
          logo acima; o respiro ABAIXO vem do pt-4 aqui.
        */}
        <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4">
          {/*
            Anexar base — mesmo padrão do consolidado (GestorEquipeSection):
            fica SEMPRE visível quando showUpload, independente de já haver
            dado do dia carregado. Antes vivia dentro do branch "hasDados
            true", o que escondia o dropzone bem no caso em que ele mais
            precisa aparecer (equipe cadastrada mas base de hoje ainda não
            enviada).
          */}
          {showUpload && (
            <div className="min-h-[90px] w-full">
              <StyledCard withGradient className="flex h-full flex-col p-3">
                <span className="text-muted-foreground mb-3 block text-xs font-semibold uppercase tracking-wider">
                  Anexar Base
                </span>
                <div className="min-h-0 flex-1">
                  <UploadTempoLogadoDropzone />
                </div>
              </StyledCard>
            </div>
          )}

          <div className="space-y-6">
            {/*
              Tabela unificada SEMPRE visível — MESMO padrão de EquipeTable
              no consolidado: o roster inteiro aparece sempre, cada
              operador SEM dado do dia já fica neutro/esmaecido por linha
              (isAusente/semDados, opacity 0.4, ValorSemDado, sem clique —
              lógica já existente em tempo-indisp-tabela.tsx, não mudou
              nada aqui). Removido o painel antigo "Nenhum dado encontrado"
              + "Mapeamento de Equipe" que SUBSTITUÍA a tabela inteira —
              não existe padrão equivalente no consolidado (lá a tabela
              nunca some, só cada linha fica neutra).

              p-3 (não p-0): mesmo respiro do consolidado entre a borda/
              cantoneiras do StyledCard e o wrapper da tabela (ver
              GestorEquipeSection, StyledCard withGradient className="h-full
              p-3" em volta de EquipeTable). Sem overflow-hidden aqui — já
              vem de TABELA_CONTAINER_CLASS dentro de TempoIndispTabela;
              duplicar no StyledCard externo clipava as cantoneiras.

              z-[45] enquanto o popover da engrenagem está aberto — mesmo
              truque de GestorEquipeSection pra tabela ficar ACIMA do
              overlay de blur (z-40) do popover, em vez de escurecida
              junto com o resto da página.
            */}
            <div
              id="tempo-indisp-tabela"
              className={cn("relative transition-[z-index] duration-0", configPopoverOpen && "z-[45]")}
            >
              <StyledCard withGradient className="p-3">
                <TempoIndispTabela
                  key="tempo-indisp-visible"
                  operadores={operadoresMerged}
                  nomeFantasia={nomeFantasia}
                  olhoAberto={olhoAberto}
                  onToggleOlho={handleToggleOlho}
                  onRowClick={abrirDialog}
                />
              </StyledCard>
            </div>

            {/*
              Cabeçalho "Analítico" — MESMO padrão de RetencaoDetalheSection
              (consolidado): reaproveitado tanto FORA do trilho (quando
              vazio, abaixo) quanto DENTRO da área pinada via prop `header`
              (quando há dados) — mesma variável JSX usada nos dois
              lugares, evita duplicar o markup.
            */}
            {(() => {
              const cabecalhoAnalitico = (
                <header className="border-border border-b border-dashed pt-2 pb-4 mb-6">
                  <h2 className="ds-h2 font-bold">Analítico</h2>
                </header>
              );

              if (!hasDados) {
                return (
                  <>
                    {cabecalhoAnalitico}
                    {/*
                      MESMO placeholder "Aguardando dados do dia" do
                      consolidado (retencao-detalhe-section.tsx) — extraído
                      pra AguardandoDadosCard (componente novo, não movido
                      de dentro do arquivo do consolidado, que fica
                      intocado). Sem RetencaoHorizontalScroll nesse estado
                      — mesmo padrão de lá: sem dado, sem GSAP/pin/scrub
                      rodando, só o card estático.
                    */}
                    <AguardandoDadosCard descricao="Ainda não há registros de tempo logado ou indisponibilidade reportados hoje pra sua equipe." />
                  </>
                );
              }

              return (
                <RetencaoHorizontalScroll
                  dynamicHeight
                  header={cabecalhoAnalitico}
                  slides={[
                    <div key="resumo-pausas" className="flex flex-col gap-6">
                      <CardsResumoAnalitico
                        operadores={operadoresMerged}
                        metaIndisponibilidade={metaIndisponibilidade}
                      />
                      <PausasDetalhadasAnalitico operadores={operadoresIndisp} />
                    </div>,
                    <AderenciaAnalitico
                      key="aderencia"
                      operadores={operadoresMerged}
                      forecastPorOperador={forecastPorOperador}
                    />,
                    <PausasNaoRealizadasAnalitico
                      key="pausas-nao-realizadas"
                      operadores={operadoresMerged}
                      forecastPorOperador={forecastPorOperador}
                    />,
                    <EstouroPausaAnalitico key="estouro-pausa" operadores={operadoresMerged} />,
                  ]}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/*
        Wrapper INVISÍVEL usado SÓ pela captura do PNG — vive off-screen pra
        não afetar o layout. Renderiza o MESMO StyledCard + tabela do site
        (variant "screen"), nos dois temas. `olhoAberto` NÃO é repassado de
        propósito: a exportação sempre força o nome fantasia, nunca revela
        nomes reais só porque o gestor estava com o olho aberto na tela no
        momento do clique.

        width = TEMPO_INDISP_TABELA_WIDTH_PX (soma das larguras MÍNIMAS das
        colunas, incl. a última em minmax(170px,1fr)) + 24px (padding p-3 do
        StyledCard, 12px de cada lado) + 2px (border de 1px de cada lado do
        próprio wrapper "excel" da tabela, `border: "1px solid #c0c0c0"` em
        tempo-indisp-tabela.tsx) — exatamente a largura que a variante
        "excel" precisa pra renderizar todas as colunas com título completo
        (a última no seu mínimo, sem sobrar nem faltar 1fr pra distribuir),
        sem o `overflow: hidden` do wrapper Excel cortar nada. Medido via
        Puppeteer: sem esses +2px de border, a última coluna ficava 2-3px
        maior que o espaço disponível e era cortada pelo overflow:hidden.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
          width: `${TEMPO_INDISP_TABELA_WIDTH_PX + 24 + 2}px`,
        }}
      >
        <div data-tempo-indisp-png>
          <StyledCard withGradient className="p-3">
            <TempoIndispTabela
              key="tempo-indisp-png"
              operadores={operadoresMerged}
              nomeFantasia={nomeFantasia}
            />
          </StyledCard>
        </div>
      </div>

      <OperadorAnaliticoDialog
        operador={selecionado}
        nomeExibido={selecionado ? formatNomeDotSobrenome(selecionado.email) : ""}
        aderencia={aderenciaSelecionado}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </motion.section>
  );
}
