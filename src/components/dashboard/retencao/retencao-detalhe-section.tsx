"use client";

import { useCallback, useEffect, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { fetchDashboardRetencaoAction } from "@/lib/retencao/actions";
import { onBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import { StyledCard } from "@/components/gestor/styled-card";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import type { HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import type { SegmentoResult } from "@/lib/retencao/get-por-segmento";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import type { MatrizResult } from "@/lib/retencao/get-matriz-volume-taxa";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { VisaoGeralCards } from "./visao-geral-cards";
import { GraficoEvolucao } from "./grafico-evolucao";
import { TabelaTemas } from "./tabela-temas";
import { TabelaSegmentos } from "./tabela-segmentos";
import { DistribuicaoQuartis } from "./distribuicao-quartis";
import { CopiarContratos } from "./copiar-contratos";
import { ConfigMetasPopover } from "./config-metas-popover";
import { RetencaoHorizontalScroll } from "./retencao-horizontal-scroll";

interface RetencaoDetalheSectionProps {
  emailsEquipeIniciais: string[];
  /** profiles.id do gestor logado — chave de escopo das metas salvas localmente (ver TODO abaixo). */
  gestorId: string;
  gestora?: string;
  reportHoraInicial?: string | null;
}

/**
 * Seção de detalhamento analítico (temas, evolução por hora, segmentos,
 * quartis, operadores) exibida dentro de /reports/consolidado, abaixo da
 * EquipeTable. Busca os próprios dados client-side (retencao_atendimentos)
 * via `fetchDashboardRetencaoAction`, sem bloquear o SSR/paint da tabela
 * principal (d1_consolidado) que já veio pronta do Server Component pai.
 *
 * TODO: metaGlobal/themeMetas ainda são persistidas em localStorage
 * (escopadas por gestorId). O padrão do resto da página (olho, ordem da
 * tabela, RV diário) já usa `gestor_config_fantasia` via server actions —
 * migrar estas metas para lá também, para não conviver dois mecanismos de
 * persistência de preferência na mesma página.
 */
export function RetencaoDetalheSection({
  emailsEquipeIniciais,
  gestorId,
  gestora = "Equipe",
  reportHoraInicial,
}: RetencaoDetalheSectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailsEquipe, setEmailsEquipe] = useState<string[]>(emailsEquipeIniciais);

  const [data, setData] = useState<{
    visaoGeral: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    porSegmento: SegmentoResult;
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    matriz: MatrizResult;
    operadoresIndividual: OperadorIndividual[];
    quartilPorOperador: Record<string, QuartilOperador>;
    nomeFantasia: NomeFantasiaSerial;
    meta: number;
  } | null>(null);

  // Metas configuradas localmente
  // Espelha o open/close do ConfigMetasPopover só pra elevar o gráfico acima
  // do overlay de blur (z-40) enquanto o popover está aberto.
  const [configMetasOpen, setConfigMetasOpen] = useState(false);

  const [metaGlobal, setMetaGlobal] = useState<number>(65);
  const [themeMetas, setThemeMetas] = useState<Record<string, number>>({
    "Mot. Financeiro": 80,
    "Ins. Atendimento": 80,
    "Ins. Serviço": 80,
    "Mud. Endereço": 60,
    "Mud. Provedora": 60,
    "Outros": 60,
  });

  // Carrega configurações salvas no localStorage (escopadas por gestorId)
  useEffect(() => {
    if (!gestorId) return;
    const globalKey = `retencao_meta_global_${gestorId}`;
    const savedGlobal = localStorage.getItem(globalKey);
    if (savedGlobal) {
      setMetaGlobal(Number(savedGlobal));
    } else {
      setMetaGlobal(65);
    }
  }, [gestorId]);

  useEffect(() => {
    if (!gestorId) return;
    const themesKey = `retencao_meta_temas_${gestorId}`;
    const savedThemes = localStorage.getItem(themesKey);
    if (savedThemes) {
      try {
        const parsed = JSON.parse(savedThemes);
        setThemeMetas({
          "Mot. Financeiro": 80,
          "Ins. Atendimento": 80,
          "Ins. Serviço": 80,
          "Mud. Endereço": 60,
          "Mud. Provedora": 60,
          "Outros": 60,
          ...parsed,
        });
      } catch (e) {
        console.error("Erro ao parsear metas do localStorage:", e);
      }
    } else {
      setThemeMetas({
        "Mot. Financeiro": 80,
        "Ins. Atendimento": 80,
        "Ins. Serviço": 80,
        "Mud. Endereço": 60,
        "Mud. Provedora": 60,
        "Outros": 60,
      });
    }
  }, [gestorId]);

  const handleSaveMetas = (newGlobal: number, newThemes: Record<string, number>) => {
    if (!gestorId) return;
    setMetaGlobal(newGlobal);
    setThemeMetas(newThemes);
    const globalKey = `retencao_meta_global_${gestorId}`;
    const themesKey = `retencao_meta_temas_${gestorId}`;
    localStorage.setItem(globalKey, String(newGlobal));
    localStorage.setItem(themesKey, JSON.stringify(newThemes));
    toast.success("Metas salvas com sucesso!");
  };

  // Extraído do useEffect de mount pra poder ser reaproveitado também
  // quando o "Limpar Base" (GestorEquipeSection, árvore irmã) avisa que
  // retencao_atendimentos foi esvaziada — ver base-cleared-event.ts.
  const load = useCallback(async (activeRef: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardRetencaoAction();

      if (!activeRef.current) return;

      if (result.success && result.data) {
        setData({
          visaoGeral: result.data.visaoGeral,
          porTema: result.data.porTema,
          evolucaoHora: result.data.evolucaoHora,
          porSegmento: result.data.porSegmento,
          quartilOperadores: result.data.quartilOperadores,
          quartilPolo: result.data.quartilPolo,
          matriz: result.data.matriz,
          operadoresIndividual: result.data.operadoresIndividual,
          quartilPorOperador: result.data.quartilPorOperador,
          nomeFantasia: result.data.nomeFantasia,
          meta: result.data.meta,
        });
        setEmailsEquipe(result.data.emailsEquipe);
      } else {
        setError(result.error || "Erro ao carregar dados do dashboard.");
      }
    } catch (err) {
      if (!activeRef.current) return;
      setError("Erro inesperado ao carregar dados.");
      console.error(err);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeRef = { current: true };
    load(activeRef);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  // Reage ao "Limpar Base" E ao upload de uma base nova (os dois disparam
  // notifyBaseAtualizada — ver comentário em base-cleared-event.ts)
  // refazendo a mesma busca — sem isso, esta seção ficaria mostrando dados
  // antigos de retencao_atendimentos até um F5 manual, mesmo com a
  // EquipeTable (d1_consolidado) já refletindo a base nova (ela reage
  // sozinha via polling de 30s, independente deste evento).
  useEffect(() => {
    const activeRef = { current: true };
    const unsubscribe = onBaseAtualizada(() => {
      load(activeRef);
    });
    return () => {
      activeRef.current = false;
      unsubscribe();
    };
  }, [load]);

  const hasNoData = !data || data.visaoGeral.total === 0;

  // Extraído pra prop: no estado "pronto" (trilho horizontal), este
  // cabeçalho vai DENTRO da área pinada do ScrollTrigger (ver
  // RetencaoHorizontalScroll `header`), pra ficar visível durante todo o
  // scroll horizontal em vez de rolar pra fora de vista antes do pin
  // engatar. Nos outros estados (loading/erro/sem dados) continua
  // renderizado normalmente, fora do trilho.
  //
  // Simplificado: removido o label "Detalhamento Analítico" e a repetição
  // de gestora/"report às HH:MM" — essa informação já aparece no
  // cabeçalho da EquipeTable logo acima ("Equipe - O supervisor [nome] fez
  // um report às HH:MM"), repetir aqui era redundante. Mesma divisória
  // tracejada (border-b border-dashed) já usada no header da página
  // (page.tsx) e em outros títulos do site — reaproveitada, não é um
  // estilo novo.
  // CAUSA do espaçamento sumindo só no estado "com dados": o gap ABAIXO da
  // divisória vinha do `space-y-6` do <section> pai — que só funciona
  // quando `cabecalho` é filho DIRETO dele (caminhos loading/error/vazio,
  // linha abaixo). No caminho "com dados", `cabecalho` é passado como prop
  // `header` pro RetencaoHorizontalScroll e renderizado DENTRO da área
  // pinada do trilho — não é mais filho do <section>, então o `space-y-6`
  // nunca chegava a aplicar. Corrigido tirando essa dependência do pai:
  // `mb-6` agora mora no PRÓPRIO header, funcionando igual nos dois lugares
  // onde `cabecalho` é usado.
  const cabecalho = (
    <header className="border-border border-b border-dashed pt-2 pb-4 mb-6">
      <h2 className="ds-h2 font-bold">Analítico</h2>
    </header>
  );

  return (
    <section>
      {(loading || error || hasNoData) && cabecalho}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <IconLoader2 size={36} className="animate-spin text-primary" />
          <p className="ds-small text-muted-foreground">Carregando dados analíticos...</p>
        </div>
      ) : error ? (
        <div className="elevation-1 bg-card border border-border/60 rounded-xl p-8 text-center min-h-[250px] flex flex-col items-center justify-center">
          <p className="ds-body text-danger font-medium">{error}</p>
        </div>
      ) : hasNoData ? (
        // Estado vazio ÚNICO pra todo o bloco Detalhamento Analítico —
        // substitui o trilho horizontal inteiro (todas as seções: visão
        // geral, temas, quartis, segmentos, contratos), então não precisa
        // de um vazio por seção separado. Antes mostrava uma lista de
        // operadores (emailsEquipe) que não fazia sentido sem dado nenhum
        // pra mostrar por operador — trocado por um placeholder mais
        // minimalista, na mesma linguagem visual do site (StyledCard com
        // cantoneiras, mono, tokens de cor), sem lista nenhuma.
        <StyledCard
          withGradient
          className="flex min-h-[350px] flex-col items-center justify-center gap-5 p-10 text-center"
        >
          {/*
            Placeholder de gráfico de barras esmaecido + "?" sobreposto —
            CSS puro, sem ilustração externa. Sugere o FORMATO que os dados
            teriam (tipo o gráfico de evolução), sem fingir ser um gráfico
            real.
          */}
          <div className="relative flex h-16 items-end gap-2" aria-hidden="true">
            {[35, 60, 25, 75, 45, 55].map((altura, idx) => (
              <div
                key={idx}
                className="bg-muted-foreground/15 w-3 rounded-t-sm"
                style={{ height: `${altura}%` }}
              />
            ))}
            <span className="ds-display text-muted-foreground/40 absolute inset-0 flex items-center justify-center text-3xl font-bold">
              ?
            </span>
          </div>

          <div className="max-w-sm space-y-1.5">
            <h3 className="ds-h3 text-foreground font-semibold">Aguardando dados do dia</h3>
            <p className="ds-body text-muted-foreground text-sm">
              Ainda não há atendimentos de retenção reportados hoje pra sua equipe.
            </p>
          </div>
        </StyledCard>
      ) : (
        <div className="space-y-6">
          {/*
            Trilho horizontal (scroll-jacking via GSAP ScrollTrigger, ver
            retencao-horizontal-scroll.tsx): os 6 blocos analíticos viram
            "slides" de largura igual, pinados enquanto o usuário rola a
            página. Só ativo em telas >= lg — no mobile os slides seguem
            empilhados verticalmente (comportamento de antes da fusão).

            `refreshKey` muda quando metaGlobal/themeMetas mudam (o popover
            de metas pode alterar altura de linhas coloridas nas tabelas),
            forçando o ScrollTrigger a recalcular as distâncias de pin.
          */}
          <RetencaoHorizontalScroll
            header={cabecalho}
            refreshKey={`${metaGlobal}-${JSON.stringify(themeMetas)}`}
            slides={[
              <div
                key="visao-geral-evolucao"
                className={`flex flex-col gap-6 ${configMetasOpen ? "relative z-50" : ""}`}
              >
                {/* Cada card mantém 100% do visual/estilo próprio (StyledCard,
                    borda, fundo, padding) — só empilhados verticalmente dentro
                    do mesmo slot do trilho, não um card único reestilizado. */}
                <VisaoGeralCards data={data!.visaoGeral} meta={metaGlobal} />
                <GraficoEvolucao
                  dados={data!.evolucaoHora}
                  meta={metaGlobal}
                  acoes={
                    <ConfigMetasPopover
                      metaGlobal={metaGlobal}
                      themeMetas={themeMetas}
                      onSave={handleSaveMetas}
                      onOpenChange={setConfigMetasOpen}
                    />
                  }
                />
              </div>,
              <TabelaTemas
                key="temas"
                scrollInterno
                temas={data!.porTema}
                metaGlobal={metaGlobal}
                themeMetas={themeMetas}
              />,
              <DistribuicaoQuartis
                key="quartis"
                scrollInterno
                operadores={data!.quartilOperadores}
                operadoresPolo={data!.quartilPolo}
                meta={metaGlobal}
              />,
              <TabelaSegmentos key="segmentos" segmentos={data!.porSegmento} meta={metaGlobal} />,
              <CopiarContratos
                key="copiar-contratos"
                scrollInterno
                emailsEquipe={emailsEquipe}
                porTema={data!.porTema}
                operadoresIndividual={data!.operadoresIndividual}
              />,
            ]}
          />
        </div>
      )}
    </section>
  );
}
