"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { ClearBaseButton } from "@/components/d-1/clear-base-button";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import { clearConsolidadoAction } from "@/lib/d1-db/actions/clear-consolidado-action";
import { saveCardsRecolhidosAction } from "@/lib/coordenador/save-cards-recolhidos-action";
import { assinaturaReportAction } from "@/lib/coordenador/assinatura-report-action";
import { CoordenadorSkeleton } from "@/app/(dashboard)/c/reports/consolidado/loading";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import {
  type CoordenadorConsolidado,
  type MetasTemas,
  type OperadorLinha,
  type ResumoTaxa,
} from "@/lib/coordenador/types";

import {
  MatrizVolumeTaxa,
  SemProducao,
} from "./analises-operadores";
import { FaceIdBloco, QualidadeRetencao, TaxaPorMarca, TemaPorSupervisor } from "./analises-polo";
import { TabelaTemas } from "@/components/dashboard/retencao/tabela-temas";
import { CardRecolhivel } from "./card-recolhivel";
import { ConfigMetaPoloPopover } from "./config-meta-polo-popover";
import { EvolucaoPolo, TabelaTaxaPorHora } from "./evolucao-polo";
import { abaixoDaMeta, classeTx, formatTx } from "./format";
import { OperadorTecnicoDialog } from "./operador-tecnico-dialog";
import { TabelaSupervisores } from "./tabela-supervisores";

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
    <div data-coord-card-taxa className="relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-lg border border-border bg-card/70 px-5 py-4 shadow-[var(--shadow-sm)] backdrop-blur-md">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-[3px] transition-[background-color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        // Mesma cor da taxa (vermelho abaixo da meta, verde na meta) —
        // padrão da faixa lateral dos cards de /kpi/gestor. Em todos os
        // cards (polo, manhã e tarde), não só no destaque.
        style={{
          backgroundColor:
            resumo.txRetencao === null
              ? "var(--muted-foreground)"
              : abaixoDaMeta(resumo.txRetencao, meta)
                ? "var(--danger)"
                : "var(--success)",
        }}
      />
      <div>
        <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
          {titulo}
          {subtitulo && <span className="normal-case tracking-normal opacity-70"> · {subtitulo}</span>}
        </p>
        <p
          className={`ds-display font-semibold tracking-tight transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${destaque ? "text-4xl" : "text-3xl"} ${classeTx(resumo.txRetencao, meta)}`}
        >
          {formatTx(resumo.txRetencao)}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        {[
          { label: "Pedidos", valor: resumo.pedidos, cor: "var(--foreground)" },
          { label: "Retidos", valor: resumo.retidos, cor: "var(--success)" },
          { label: "Churn", valor: resumo.cancelados, cor: "var(--danger)" },
        ].map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5"
          >
            <dt className="text-foreground/75 flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.cor }} />
              {item.label}
            </dt>
            <dd
              className="text-foreground mt-0.5 text-base font-normal tracking-tight"
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
  metasTemas,
  cardsRecolhidos,
}: {
  dados: CoordenadorConsolidado;
  meta: number;
  /** Meta de TX Retenção por tema (0–100); tema sem valor = meta do polo. */
  metasTemas: MetasTemas;
  /** Cards que o usuário deixou recolhidos (salvos em coordenador_config). */
  cardsRecolhidos: string[];
}) {
  const [operadorAberto, setOperadorAberto] = useState<OperadorLinha | null>(null);
  // Espelha o open/close da engrenagem: os cards de taxa sobem acima do
  // desfoque (z-40 do overlay) pra meta nova ser comparada com eles — mesmo
  // padrão de configPopoverOpen em GestorEquipeSection.
  const [configAberta, setConfigAberta] = useState(false);

  const router = useRouter();

  // ── Limpar base: mesmo overlay do /s ──
  // O ClearBaseButton chama onCleared e depois router.refresh(). O esqueleto
  // do F5 (CoordenadorSkeleton) cobre a área de conteúdo até as DUAS coisas
  // acontecerem: piso de 3s (MIN_REFRESH_LOADING_MS, igual ao /s) e os dados
  // novos chegarem do servidor (prop `dados` muda).
  const MIN_REFRESH_LOADING_MS = 3_000;
  const [recarregando, setRecarregando] = useState(false);
  const recarga = useRef<{ desde: number; dadosNovos: boolean } | null>(null);
  const fecharSeProntoRef = useRef<() => void>(() => {});
  fecharSeProntoRef.current = () => {
    const r = recarga.current;
    if (!r || !r.dadosNovos) return;
    const faltam = MIN_REFRESH_LOADING_MS - (Date.now() - r.desde);
    if (faltam > 0) {
      window.setTimeout(() => fecharSeProntoRef.current(), faltam);
      return;
    }
    recarga.current = null;
    setRecarregando(false);
  };
  const handleBaseCleared = () => {
    recarga.current = { desde: Date.now(), dadosNovos: false };
    setRecarregando(true);
  };
  useEffect(() => {
    if (!recarga.current) return;
    recarga.current.dadosNovos = true;
    fecharSeProntoRef.current();
  }, [dados]);

  // ── Atualização automática (supervisor colou/limpou a base) ──
  // Mesmo intervalo do polling do /s (30s): consulta só a "assinatura" do
  // report do dia (hora + quem subiu + nº de linhas) e, se mudou, recarrega
  // os dados da página (router.refresh) — sem F5. A 1ª leitura vira a
  // referência.
  useEffect(() => {
    let referencia: string | null = null;
    let parado = false;
    const verificar = async () => {
      try {
        const r = await assinaturaReportAction();
        if (!r.success || parado) return;
        if (referencia !== null && r.assinatura !== referencia) router.refresh();
        referencia = r.assinatura;
      } catch (err) {
        if (handleStaleActionError(err)) {
          parado = true;
          window.clearInterval(id);
          return;
        }
        console.error("[CoordenadorConsolidadoView] verificar base nova:", err);
      }
    };
    verificar();
    const id = window.setInterval(verificar, 30_000);
    return () => {
      parado = true;
      window.clearInterval(id);
    };
  }, [router]);

  // Cards recolhidos: estado inicial vem do banco (por usuário) e cada
  // clique salva a lista inteira (saveCardsRecolhidosAction, sem esperar).
  const recolhidos = useRef(new Set(cardsRecolhidos));
  const alternarCard = (chave: string, recolhido: boolean) => {
    if (recolhido) recolhidos.current.add(chave);
    else recolhidos.current.delete(chave);
    saveCardsRecolhidosAction([...recolhidos.current]).catch((err) => {
      if (handleStaleActionError(err)) return;
      console.error("[CoordenadorConsolidadoView] salvar cards recolhidos:", err);
    });
  };
  const recolhivel = (chave: string) => ({
    chave,
    recolhidoInicial: cardsRecolhidos.includes(chave),
    onAlternar: alternarCard,
  });

  const cabecalhoReport = formatCabecalhoReport(dados.reportHora, dados.reportNomeSupervisor);
  const semDados = dados.polo.pedidos === 0 && dados.supervisores.length === 0;

  return (
    <div className="space-y-12">
      {/*
        Overlay do "Limpar base" — MESMO esqueleto do F5, fixo por cima só da
        área de conteúdo (abaixo do header de 60px, à direita da sidebar de
        240px em lg+), igual ao /s. !mb-0: este div é filho do space-y-12.
      */}
      {recarregando && (
        <div className="fixed inset-x-0 top-[60px] bottom-0 z-[100] !mb-0 overflow-hidden lg:left-[240px]">
          <CoordenadorSkeleton />
        </div>
      )}
      {/* Cabeçalho + controles + (cards de taxa | anexo) — mesma estrutura de
          /s/reports/consolidado. !mb-6 encurta o respiro até "Resultado
          supervisores" (no Tailwind v4 o space-y-12 vira margin-bottom do
          irmão anterior, então o ajuste fica aqui, não no mt da seção). */}
      <div className="!mb-6">
        <div>
          <div className="pt-4">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Consolidado
            </h1>
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {cabecalhoReport ?? "Aguardando o primeiro report do dia"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
            <ConfigMetaPoloPopover
              metaInicial={meta}
              metasTemasIniciais={metasTemas}
              onOpenChange={setConfigAberta}
            />
            {/* Mesmo botão e ordem do /s/reports/consolidado: segurar para
                confirmar. Limpa a base do dia do polo inteiro (é a mesma base
                de todas as equipes). */}
            <ClearBaseButton
              action={clearConsolidadoAction}
              onCleared={handleBaseCleared}
              toastClassName="reports-consolidado-toast"
            />
          </div>
        </div>

        {/* Mesma linha do /s/reports/consolidado: bloco principal à esquerda
            (aqui, os cards de taxa empilhados) e o card de anexo à direita,
            esticado na altura do bloco. Abaixo de lg, empilha. */}
        <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-stretch">
          {!semDados && (
            <div
              className={cn(
                // Moldura de respiro (-m-3 + p-3 se anulam, o layout não se
                // mexe); com a engrenagem aberta ganha fundo sólido + borda e
                // sobe acima do desfoque — troca INSTANTÂNEA (ver style).
                "relative -m-3 flex min-w-0 flex-col gap-3 rounded-xl p-3 ring-1 lg:flex-[3]",
                configAberta ? "z-[45] bg-background ring-border" : "ring-transparent",
              )}
              // Inline (não classe): a regra global de globals.css
              // (div { transition: background-color 0.2s ... }) é unlayered e
              // vence o Tailwind — o fundo entrava com fade e a moldura
              // "piscava"/chegava atrasada sobre o blur. Mesma correção de
              // tempo-indisp-section.tsx.
              style={{ transition: "none" }}
            >
              <CardTaxa titulo="Taxa do Polo Geral" resumo={dados.polo} meta={meta} destaque />
              <CardTaxa titulo="Manhã" resumo={dados.manha} meta={meta} />
              <CardTaxa titulo="Tarde" resumo={dados.tarde} meta={meta} />
            </div>
          )}

          <div className={cn("min-h-[180px] min-w-0 flex-1 self-stretch", !semDados && "lg:flex-[2]")}>
            <UploadDropzone abrirEmDownloads />
          </div>
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
          {/*
            Tudo vertical (sem rolagem lateral), na mesma ordem de antes:
            supervisores → evolução → taxa por hora → tema polo → tema
            supervisores → gráfico prioridade → sem atendimento → regional →
            marca → custo → abortados. Cada card recolhe ao clicar no título
            (CardRecolhivel); !mb-6 = 24px entre os cards (no Tailwind v4 o
            space-y-12 vira margin-bottom do irmão anterior).
          */}
          <CardRecolhivel {...recolhivel("supervisores")} className="!mb-6">
            <section>
              <TituloBloco
                id="coord-supervisores"
                compacto
                titulo="Tabela supervisores"
                subtitulo="Equipes da manhã no topo e da tarde abaixo. Clique em um supervisor para abrir os operadores da equipe."
              />
              <TabelaSupervisores
                supervisores={dados.supervisores}
                operadores={dados.operadores}
                meta={meta}
                onSelecionarOperador={setOperadorAberto}
              />
            </section>
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("evolucao")} className="!mb-6">
            <section>
              <TituloBloco
                id="coord-evolucao"
                compacto
                titulo="Evolução do polo"
                subtitulo="Pedidos, retidos e cancelados por hora, com a taxa do polo em cada hora e o total do dia. Passe o mouse para ver quem derrubou a taxa em cada hora."
              />
              <EvolucaoPolo evolucao={dados.evolucao} supervisores={dados.supervisores} meta={meta} />
            </section>
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("taxa-hora")} className="!mb-6">
            <TabelaTaxaPorHora evolucao={dados.evolucao} supervisores={dados.supervisores} meta={meta} />
          </CardRecolhivel>

          {/* MESMO componente da "Taxa de retenção por tema" do /s (TabelaTemas,
              com o CSS [data-tabela-temas] de reports-consolidado.css) — só os
              dados do polo convertidos pro formato dele. */}
          <CardRecolhivel {...recolhivel("temas-polo")} className="!mb-6 scroll-mt-24">
            <div id="coord-temas">
              <TabelaTemas
                titulo="Taxa por tema - Polo"
                descricao="Clique num motivo para ver os submotivos e a taxa de cada tópico."
                temas={dados.temas.map((t) => ({
                  motivo: t.tema,
                  total: t.pedidos,
                  retidos: t.retidos,
                  cancelados: t.cancelados,
                  tx: t.txRetencao,
                  submotivos: t.submotivos.map((sub) => {
                    const total = sub.retidos + sub.cancelados;
                    return {
                      submotivo: sub.submotivo,
                      total,
                      retidos: sub.retidos,
                      cancelados: sub.cancelados,
                      tx: total > 0 ? sub.retidos / total : null,
                    };
                  }),
                }))}
                metaGlobal={meta}
                themeMetas={metasTemas}
              />
            </div>
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("temas-supervisores")} className="!mb-6">
            <div id="coord-temas-supervisores">
              <TemaPorSupervisor
                temas={dados.temas}
                supervisores={dados.supervisores}
                meta={meta}
                metasTemas={metasTemas}
              />
            </div>
          </CardRecolhivel>

          {/* Gráfico + lista de prioridade: altura da tela menos 12rem (só a
              lista rola por dentro; o gráfico encolhe, mínimo 220px). */}
          <CardRecolhivel {...recolhivel("grafico-prioridade")} className="!mb-6">
            <div id="coord-operadores" className="lg:h-[calc(100vh-12rem)]">
              <MatrizVolumeTaxa operadores={dados.operadores} meta={meta} onSelecionar={setOperadorAberto} />
            </div>
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("sem-atendimento")} className="!mb-6">
            <div id="coord-sem-producao">
              <SemProducao operadores={dados.operadores} supervisores={dados.supervisores} />
            </div>
          </CardRecolhivel>

          {/* MESMA tabela da "Taxa por tema - Polo": estado → cidades. */}
          <CardRecolhivel {...recolhivel("regional")} className="!mb-6">
            <TabelaTemas
              titulo="Taxa por regional"
              descricao="Retenção de cada estado. Clique num estado para ver as cidades."
              rotuloColuna="Estado"
              temas={dados.regionais.map((r) => ({
                motivo: r.nome,
                total: r.pedidos,
                retidos: r.retidos,
                cancelados: r.cancelados,
                tx: r.txRetencao,
                // Cidades da MENOR para a maior taxa (pedido); sem taxa no fim.
                submotivos: [...r.cidades]
                  .sort((a, b) => (a.txRetencao ?? Infinity) - (b.txRetencao ?? Infinity))
                  .map((c) => ({
                    submotivo: c.chave,
                    total: c.pedidos,
                    retidos: c.retidos,
                    cancelados: c.cancelados,
                    tx: c.txRetencao,
                  })),
              }))}
              metaGlobal={meta}
              themeMetas={{}}
            />
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("marca")} className="!mb-6">
            <div id="coord-taxa-marca">
              <TaxaPorMarca marcas={dados.marcas} meta={meta} />
            </div>
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("custo")} className="!mb-6">
            <QualidadeRetencao polo={dados.tiposRetencaoPolo} supervisores={dados.supervisores} />
          </CardRecolhivel>

          <CardRecolhivel {...recolhivel("abortados")} className="scroll-mt-24">
            <div id="coord-abortados">
              <FaceIdBloco faceId={dados.faceId} polo={dados.polo} supervisores={dados.supervisores} meta={meta} />
            </div>
          </CardRecolhivel>
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
