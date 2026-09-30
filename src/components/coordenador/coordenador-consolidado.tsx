"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";
import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { clearConsolidadoAction } from "@/lib/d1-db/actions/clear-consolidado-action";
import {
  MIN_PEDIDOS_BAIXO_RENDIMENTO,
  type CoordenadorConsolidado,
  type OperadorLinha,
  type ResumoTaxa,
} from "@/lib/coordenador/types";

import {
  MatrizVolumeTaxa,
  SemProducao,
} from "./analises-operadores";
import { FaceIdBloco, MarcasUnidades, QualidadeRetencao, TemaPorSupervisor } from "./analises-polo";
import { CancelamentoTema } from "./cancelamento-tema";
import { ConfigMetaPoloPopover } from "./config-meta-polo-popover";
import { EvolucaoPolo, TabelaTaxaPorHora } from "./evolucao-polo";
import { abaixoDaMeta, classeTx, formatTx } from "./format";
import { OperadorTecnicoDialog } from "./operador-tecnico-dialog";
import { TabelaOperadores, TabelaSupervisores } from "./tabela-supervisores";

/* ───────── Cards de taxa (polo / manhã / tarde) ───────── */

function CardTaxa({
  titulo,
  subtitulo,
  resumo,
  meta,
  destaque = false,
}: {
  titulo: string;
  subtitulo?: string;
  resumo: ResumoTaxa;
  meta: number;
  destaque?: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
      {destaque && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 h-full w-[3px]"
          // Mesma cor da taxa (vermelho abaixo da meta, verde na meta) —
          // padrão da faixa lateral dos cards de /kpi/gestor.
          style={{
            background:
              resumo.txRetencao === null
                ? "var(--muted-foreground)"
                : abaixoDaMeta(resumo.txRetencao, meta)
                  ? "var(--danger)"
                  : "var(--success)",
          }}
        />
      )}
      <div>
        <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
          {titulo}
          {subtitulo && <span className="normal-case tracking-normal opacity-70"> · {subtitulo}</span>}
        </p>
        <p
          className={`ds-display font-semibold tracking-tight ${destaque ? "text-5xl" : "text-4xl"} ${classeTx(resumo.txRetencao, meta)}`}
        >
          {formatTx(resumo.txRetencao)}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
        {[
          { label: "Pedidos", valor: resumo.pedidos, cor: "var(--foreground)" },
          { label: "Retidos", valor: resumo.retidos, cor: "var(--success)" },
          { label: "Churn", valor: resumo.cancelados, cor: "var(--danger)" },
        ].map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2"
          >
            <dt className="text-foreground/75 flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.cor }} />
              {item.label}
            </dt>
            <dd
              className="text-foreground mt-0.5 text-lg font-normal tracking-tight"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {item.valor.toLocaleString("pt-BR")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Um slide do trilho. O trilho roda com `dynamicHeight` (altura = slide mais
 * alto, medida pelo scrollHeight do 1º filho de cada slide), então:
 * - wrapper externo SEM overflow: o scrollHeight dele é a altura já limitada
 *   do miolo, nunca a do conteúdo inteiro;
 * - miolo com teto = altura da tela menos o header do app (60px) e uma folga,
 *   rolando por dentro só se passar disso — nada fica cortado nem sai da tela
 *   enquanto o trilho está pinado.
 * Abaixo de lg vira bloco normal (slides empilhados, sem teto).
 */
function Slide({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:pb-8">
      <div className="scrollbar-tema lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-3 lg:pt-2">{children}</div>
    </div>
  );
}

function TituloBloco({
  id,
  titulo,
  subtitulo,
  compacto = false,
  divisoria = false,
}: {
  id?: string;
  titulo: string;
  subtitulo: string;
  /** Tamanho de título de card do Consolidado do supervisor (ds-h3). */
  compacto?: boolean;
  /**
   * Divisória de grupo ("Título ————", mesmo padrão aprovado na ficha do
   * operador): abre um grupo de vários cards, um nível acima dos títulos
   * dos cards de dentro.
   */
  divisoria?: boolean;
}) {
  if (divisoria) {
    return (
      <header id={id} className="scroll-mt-24 pt-2">
        <div className="flex items-center gap-4">
          <h2 className="text-foreground shrink-0 text-2xl font-semibold tracking-tight">{titulo}</h2>
          <div aria-hidden="true" className="bg-border h-px flex-1" />
        </div>
        <p className="font-sans text-muted-foreground pt-1 text-sm">{subtitulo}</p>
      </header>
    );
  }
  if (compacto) {
    return (
      <header id={id} className="scroll-mt-24 pb-4">
        <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
        <p className="ds-small text-muted-foreground mt-1">{subtitulo}</p>
      </header>
    );
  }
  return (
    <header id={id} className="scroll-mt-24 pb-4">
      <h2 className="font-sans text-2xl font-semibold tracking-tight text-foreground">{titulo}</h2>
      <p className="font-sans text-muted-foreground pt-1 text-sm">{subtitulo}</p>
    </header>
  );
}

function formatCabecalhoReport(hora: string | null, nome: string | null): string | null {
  if (!hora || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const quem = nome?.trim();
  return quem ? `${quem} fez report às ${horaCurta}` : `Atualizado às ${horaCurta}`;
}

/* ───────── Página ───────── */

export function CoordenadorConsolidadoView({
  dados,
  meta,
  metaFinanceiro,
}: {
  dados: CoordenadorConsolidado;
  meta: number;
  /** Meta do tema "Mot. Financeiro" (0–100). */
  metaFinanceiro: number;
}) {
  const [operadorAberto, setOperadorAberto] = useState<OperadorLinha | null>(null);
  // Espelha o open/close da engrenagem: os cards de taxa sobem acima do
  // desfoque (z-40 do overlay) pra meta nova ser comparada com eles — mesmo
  // padrão de configPopoverOpen em GestorEquipeSection.
  const [configAberta, setConfigAberta] = useState(false);

  const cabecalhoReport = formatCabecalhoReport(dados.reportHora, dados.reportNomeSupervisor);
  const semDados = dados.polo.pedidos === 0 && dados.supervisores.length === 0;

  return (
    <div className="space-y-12">
      {/* Cabeçalho + controles + anexo — mesma estrutura de
          /s/reports/tempo-indisponibilidade (título, linha de controles com a
          engrenagem, card de anexo em largura cheia logo abaixo). */}
      <div className="space-y-2">
        <div>
          <div className="pt-4">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Consolidado
            </h1>
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {cabecalhoReport ?? "Aguardando o primeiro report do dia"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 pb-1">
            <ConfigMetaPoloPopover
              metaInicial={meta}
              metaFinanceiroInicial={metaFinanceiro}
              onOpenChange={setConfigAberta}
            />
            {/* Mesmo botão e ordem do /s/reports/consolidado: segurar para
                confirmar. Limpa a base do dia do polo inteiro (é a mesma base
                de todas as equipes). */}
            <ClearBaseButton
              action={clearConsolidadoAction}
              variant="icon-danger"
              holdToConfirm
              toastClassName="reports-consolidado-toast"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <UploadDropzone variante="vertical" />
        </div>
      </div>

      {semDados ? (
        <div
          className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
          style={{ border: "1px solid var(--border)" }}
        >
          A base do dia ainda não foi atualizada.
        </div>
      ) : (
        <>
          <section
            className={cn(
              "relative !mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr]",
              configAberta && "z-[45]",
            )}
          >
            <div className="md:col-span-2 xl:col-span-1">
              <CardTaxa titulo="Taxa do Polo Geral" resumo={dados.polo} meta={meta} destaque />
            </div>
            <CardTaxa titulo="Manhã" resumo={dados.manha} meta={meta} />
            <CardTaxa titulo="Tarde" resumo={dados.tarde} meta={meta} />
          </section>

          <section>
            <TituloBloco
              id="coord-supervisores"
              compacto
              titulo="Resultado supervisores"
              subtitulo="Manhã em cima, tarde embaixo. Clique no supervisor para ver os operadores da equipe."
            />
            <TabelaSupervisores
              supervisores={dados.supervisores}
              operadores={dados.operadores}
              meta={meta}
              onSelecionarOperador={setOperadorAberto}
            />
          </section>

          <section>
            <TituloBloco
              id="coord-evolucao"
              compacto
              titulo="Evolução do polo"
              subtitulo="Taxa do polo hora a hora e acumulada no dia. Passe o mouse para ver quem derrubou a taxa em cada hora; clique no gráfico para ver a tabela de hora em hora."
            />
            <EvolucaoPolo evolucao={dados.evolucao} supervisores={dados.supervisores} meta={meta} />
          </section>

          {/*
            Trilho horizontal — MESMO componente e MESMAS regras do
            /s/reports/consolidado (RetencaoHorizontalScroll: pin abaixo do
            header, scroll vertical vira deslocamento lateral, um card por
            vez com snap no mais próximo, folga no fim, só em telas >= lg;
            abaixo disso os slides ficam empilhados). Começa depois do gráfico
            "Evolução do polo" e termina antes da assinatura.
          */}
          <RetencaoHorizontalScroll
            dynamicHeight
            refreshKey={`${meta}-${dados.reportHora ?? ""}`}
            slides={[
              <Slide key="taxa-hora">
                <TabelaTaxaPorHora evolucao={dados.evolucao} supervisores={dados.supervisores} meta={meta} />
              </Slide>,

              <Slide key="operadores">
                <div className="space-y-6">
                  <TituloBloco
                    id="coord-operadores"
                    divisoria
                    titulo="Operadores"
                    subtitulo="Onde estão os resultados ruins do polo, operador a operador."
                  />
                  <MatrizVolumeTaxa operadores={dados.operadores} meta={meta} onSelecionar={setOperadorAberto} />
                </div>
              </Slide>,

              <Slide key="temas">
                <TituloBloco
                  id="coord-temas"
                  compacto
                  titulo="Taxa por tema"
                  subtitulo="Retenção e cancelamento de cada tema no polo (clique no tema para abrir os submotivos). Embaixo, a taxa de cada tema em cada equipe (pedidos embaixo)."
                />
                <div className="space-y-4">
                  <CancelamentoTema temas={dados.temas} meta={meta} />
                  <TemaPorSupervisor temas={dados.temas} supervisores={dados.supervisores} meta={meta} />
                </div>
              </Slide>,

              <Slide key="baixo-rendimento">
                <TituloBloco
                  id="coord-baixo-rendimento"
                  compacto
                  titulo="Operadores de baixo rendimento"
                  subtitulo={`Abaixo da meta de ${meta}% com pelo menos ${MIN_PEDIDOS_BAIXO_RENDIMENTO} pedidos no dia, pior taxa primeiro. Clique no operador para ver o detalhe técnico.`}
                />
                {dados.baixoRendimento.length === 0 ? (
                  <div
                    className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    Nenhum operador abaixo da meta de {meta}% até agora.
                  </div>
                ) : (
                  <TabelaOperadores
                    operadores={dados.baixoRendimento}
                    meta={meta}
                    onSelecionar={setOperadorAberto}
                    mostrarSupervisor
                    alturaMaxima={420}
                  />
                )}
              </Slide>,

              <Slide key="sem-producao">
                <SemProducao operadores={dados.operadores} supervisores={dados.supervisores} />
              </Slide>,

              <Slide key="marcas">
                <MarcasUnidades marcas={dados.marcas} unidades={dados.unidades} meta={meta} mostrar="marcas" />
              </Slide>,

              <Slide key="cidades">
                <MarcasUnidades marcas={dados.marcas} unidades={dados.unidades} meta={meta} mostrar="cidades" />
              </Slide>,

              <Slide key="custo">
                <QualidadeRetencao polo={dados.tiposRetencaoPolo} supervisores={dados.supervisores} />
              </Slide>,

              <Slide key="abortados">
                <FaceIdBloco faceId={dados.faceId} supervisores={dados.supervisores} />
              </Slide>,
            ]}
          />
        </>
      )}

      <OperadorTecnicoDialog
        operador={operadorAberto}
        atendimentos={operadorAberto ? (dados.atendimentosPorOperador[operadorAberto.login] ?? []) : []}
        meta={meta}
        txEquipe={
          operadorAberto
            ? (dados.supervisores.find((s) => s.gestorId === operadorAberto.gestorId)?.txRetencao ?? null)
            : null
        }
        txPolo={dados.polo.txRetencao}
        onClose={() => setOperadorAberto(null)}
      />
    </div>
  );
}
