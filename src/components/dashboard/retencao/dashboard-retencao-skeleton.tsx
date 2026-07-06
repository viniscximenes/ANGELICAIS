"use client";

import { useEffect, useState } from "react";
import { IconLoader2, IconUsers } from "@tabler/icons-react";
import { PageTransition } from "@/components/motion/page-transition";
import { toast } from "sonner";
import { fetchDashboardRetencaoAction, type QuedaComContribuicao } from "@/lib/retencao/actions";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import type { HoraEvolucaoData } from "@/lib/retencao/get-evolucao-hora";
import type { SegmentoResult } from "@/lib/retencao/get-por-segmento";
import type { OperadorItem } from "@/lib/retencao/get-por-operador";
import type { OperadorQuartilItem } from "@/lib/retencao/get-quartil-operadores";
import type { MatrizResult } from "@/lib/retencao/get-matriz-volume-taxa";
import type { AlertaItem } from "@/lib/retencao/get-alertas";
import { VisaoGeralCards } from "./visao-geral-cards";
import { TabelaTemas } from "./tabela-temas";
import { GraficoEvolucao } from "./grafico-evolucao";
import { ListaQuedas } from "./lista-quedas";
import { TabelaSegmentos } from "./tabela-segmentos";
import { PainelAlertas } from "./painel-alertas";
import { DistribuicaoQuartis } from "./distribuicao-quartis";
import { CopiarContratos } from "./copiar-contratos";
import { ConfigMetas } from "./config-metas";

interface DashboardRetencaoSkeletonProps {
  emailsEquipe: string[];
  userKey: string;
}

export function DashboardRetencaoSkeleton({
  emailsEquipe: emailsEquipeIniciais,
  userKey,
}: DashboardRetencaoSkeletonProps) {
  const [escopo, setEscopo] = useState<"equipe" | "empresa">("equipe");
  const [turno, setTurno] = useState<"manha" | "tarde">("manha");
  const [horaSelecionada, setHoraSelecionada] = useState<"total" | number>("total");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailsEquipe, setEmailsEquipe] = useState<string[]>(emailsEquipeIniciais);

  const [data, setData] = useState<{
    visaoGeral: VisaoGeralData;
    visaoGeralTotal: VisaoGeralData;
    visaoGeralManha: VisaoGeralData;
    visaoGeralTarde: VisaoGeralData;
    porTema: TemaData[];
    evolucaoHora: HoraEvolucaoData[];
    quedas: QuedaComContribuicao[];
    porSegmento: SegmentoResult;
    porOperador: OperadorItem[];
    quartilOperadores: OperadorQuartilItem[];
    quartilPolo: OperadorQuartilItem[];
    matriz: MatrizResult;
    alertas: AlertaItem[];
    meta: number;
  } | null>(null);

  // Metas configuradas localmente
  const [metaGlobal, setMetaGlobal] = useState<number>(65);
  const [themeMetas, setThemeMetas] = useState<Record<string, number>>({
    "Mot. Financeiro": 80,
    "Ins. Atendimento": 80,
    "Ins. Serviço": 80,
    "Mud. Endereço": 60,
    "Mud. Provedora": 60,
    "Outros": 60,
  });

  // Carrega configurações salvas no localStorage (escopadas por usuário)
  useEffect(() => {
    if (!userKey) return;
    const globalKey = `retencao_meta_global_${userKey.toLowerCase().trim()}`;
    const savedGlobal = localStorage.getItem(globalKey);
    if (savedGlobal) {
      setMetaGlobal(Number(savedGlobal));
    } else {
      setMetaGlobal(65);
    }
  }, [userKey]);

  useEffect(() => {
    if (!userKey) return;
    const themesKey = `retencao_meta_temas_${userKey.toLowerCase().trim()}`;
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
  }, [userKey]);

  const handleSaveMetas = (newGlobal: number, newThemes: Record<string, number>) => {
    if (!userKey) return;
    setMetaGlobal(newGlobal);
    setThemeMetas(newThemes);
    const globalKey = `retencao_meta_global_${userKey.toLowerCase().trim()}`;
    const themesKey = `retencao_meta_temas_${userKey.toLowerCase().trim()}`;
    localStorage.setItem(globalKey, String(newGlobal));
    localStorage.setItem(themesKey, JSON.stringify(newThemes));
    toast.success("Metas salvas com sucesso!");
  };

  const de = horaSelecionada === "total" ? (turno === "manha" ? 8 : 14) : horaSelecionada;
  const ate = horaSelecionada === "total" ? (turno === "manha" ? 13 : 19) : horaSelecionada;

  const handleTurnoChange = (newTurno: "manha" | "tarde") => {
    setTurno(newTurno);
    setHoraSelecionada("total");
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const result = await fetchDashboardRetencaoAction(
          escopo,
          { horaInicio: de, horaFim: ate },
          turno,
        );

        if (!active) return;

        if (result.success && result.data) {
          setData({
            visaoGeral: result.data.visaoGeral,
            visaoGeralTotal: result.data.visaoGeralTotal,
            visaoGeralManha: result.data.visaoGeralManha,
            visaoGeralTarde: result.data.visaoGeralTarde,
            porTema: result.data.porTema,
            evolucaoHora: result.data.evolucaoHora,
            quedas: result.data.quedas,
            porSegmento: result.data.porSegmento,
            porOperador: result.data.porOperador,
            quartilOperadores: result.data.quartilOperadores,
            quartilPolo: result.data.quartilPolo,
            matriz: result.data.matriz,
            alertas: result.data.alertas,
            meta: result.data.meta,
          });
          setEmailsEquipe(result.data.emailsEquipe);
        } else {
          setError(result.error || "Erro ao carregar dados do dashboard.");
        }
      } catch (err) {
        if (!active) return;
        setError("Erro inesperado ao carregar dados.");
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [escopo, de, ate, turno]);

  const hasNoData = !data || data.visaoGeral.total === 0;

  const formatHorarioExibicao = () => {
    if (horaSelecionada === "total") {
      return turno === "manha" ? "08h às 13h (Total)" : "14h às 19h (Total)";
    }
    return `${String(horaSelecionada).padStart(2, "0")}:00`;
  };

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-wrap items-baseline gap-3">
            <h1 className="ds-h1">Analitico Consolidado</h1>
            <span className="ds-mono-sm text-muted-foreground">
              / turno · {turno === "manha" ? "Manhã" : "Tarde"}
            </span>
          </header>

          {/* Controles do Painel */}
          <div className="flex flex-wrap items-center gap-3">
          {/* Toggle de Escopo */}
          <div role="tablist" className="elevation-1 inline-flex gap-1 rounded-md p-1 bg-muted/20">
            {(["equipe", "empresa"] as const).map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={escopo === mode}
                onClick={() => setEscopo(mode)}
                type="button"
                className={[
                  "ds-small rounded-md px-4 py-1.5 transition-colors cursor-pointer capitalize font-medium",
                  escopo === mode
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {mode === "empresa" ? "Polo" : "Equipe"}
              </button>
            ))}
          </div>

          {/* Seletor de Turno */}
          <div role="tablist" className="elevation-1 inline-flex gap-1 rounded-md p-1 bg-muted/20">
            {(["manha", "tarde"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={turno === t}
                onClick={() => handleTurnoChange(t)}
                type="button"
                className={[
                  "ds-small rounded-md px-4 py-1.5 transition-colors cursor-pointer capitalize font-medium",
                  turno === t
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t === "manha" ? "Manhã" : "Tarde"}
              </button>
            ))}
          </div>

          {/* Select de Hora Específica */}
          {/* Seletor de Hora Específica */}
          <div role="tablist" className="elevation-1 inline-flex gap-1 rounded-md p-1 bg-muted/20 flex-wrap">
            <button
              role="tab"
              aria-selected={horaSelecionada === "total"}
              onClick={() => setHoraSelecionada("total")}
              type="button"
              className={[
                "ds-small rounded-md px-3.5 py-1.5 transition-colors cursor-pointer font-medium text-xs",
                horaSelecionada === "total"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              Período Total
            </button>
            {(turno === "manha" ? [8, 9, 10, 11, 12, 13] : [14, 15, 16, 17, 18, 19]).map((h) => (
              <button
                key={h}
                role="tab"
                aria-selected={horaSelecionada === h}
                onClick={() => setHoraSelecionada(h)}
                type="button"
                className={[
                  "ds-small rounded-md px-3 py-1.5 transition-colors cursor-pointer font-mono font-medium text-xs",
                  horaSelecionada === h
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {String(h).padStart(2, "0")}:00
              </button>
            ))}
          </div>
        </div>

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
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 elevation-1 bg-card border border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[350px]">
            <div className="max-w-md space-y-3">
              <h3 className="ds-h3 text-foreground font-semibold">Nenhum atendimento encontrado</h3>
              <p className="ds-body text-muted-foreground text-sm">
                Não existem registros de atendimentos de retenção cadastrados no banco para o escopo e período de horas selecionados.
              </p>
              <div className="inline-flex flex-wrap justify-center gap-3 pt-3">
                <span className="ds-mono-sm px-2.5 py-1 bg-muted rounded border border-border/40 text-xs">
                  Escopo: <strong className="capitalize">{escopo}</strong>
                </span>
                <span className="ds-mono-sm px-2.5 py-1 bg-muted rounded border border-border/40 text-xs">
                  Horário: {formatHorarioExibicao()}
                </span>
              </div>
            </div>
          </div>

          {/* Painel da Equipe Mapeada */}
          <div className="elevation-1 bg-card border border-border/60 rounded-xl p-6 space-y-4 flex flex-col">
            <div>
              <h4 className="ds-mono-sm font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                Mapeamento de Equipe
              </h4>
              <p className="ds-body text-foreground mt-1 font-semibold text-sm">
                {emailsEquipe.length} operadores
              </p>
            </div>

            <div className="flex-1 min-h-[200px] max-h-[350px] overflow-y-auto border border-border/40 rounded-lg p-3 bg-black/5 space-y-1.5 scrollbar-tema">
              {emailsEquipe.length === 0 ? (
                <p className="ds-small text-muted-foreground text-center py-8">
                  Nenhum operador na equipe.
                </p>
              ) : (
                emailsEquipe.map((email) => (
                  <div
                    key={email}
                    className="ds-mono-sm px-2.5 py-1 bg-muted/40 rounded border border-border/20 text-muted-foreground truncate text-xs"
                  >
                    {email}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Coluna Principal (Blocos 1, 3, 5, 6, 7, 8, 9 e a grid dos blocos) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Bloco 9: Alertas Automáticos */}
            <PainelAlertas alertas={data!.alertas} />

             {/* Bloco 1: Visão Geral */}
              {escopo === "empresa" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">CONSOLIDADO</h4>
                    <VisaoGeralCards data={data!.visaoGeralTotal} meta={metaGlobal} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {turno === "manha" ? "MANHÃ" : "TARDE"}
                    </h4>
                    <VisaoGeralCards data={turno === "manha" ? data!.visaoGeralManha : data!.visaoGeralTarde} meta={metaGlobal} />
                  </div>
                </div>
              ) : (
               <VisaoGeralCards
                 data={data!.visaoGeral}
                 meta={metaGlobal}
               />
             )}
 
             {/* Bloco 3: Evolução por hora */}
            <GraficoEvolucao
              dados={data!.evolucaoHora}
              horaSelecionada={horaSelecionada}
              meta={metaGlobal}
            />
 
             {/* Grid de Quedas e Segmentos */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Bloco 4: Detecção de queda */}
               <ListaQuedas quedas={data!.quedas} />
 
               {/* Bloco 5: Por Segmento */}
               <TabelaSegmentos segmentos={data!.porSegmento} meta={metaGlobal} />
             </div>
 
             {/* Bloco 2: Por Tema */}
             <TabelaTemas temas={data!.porTema} metaGlobal={metaGlobal} themeMetas={themeMetas} />

            {/* Bloco 7: Quartil de Operadores */}
            <DistribuicaoQuartis
              operadores={data!.quartilOperadores}
              operadoresPolo={data!.quartilPolo}
              hideTeamToggle={escopo === "empresa"}
            />
          </div>

          {/* Painel Lateral: Equipe e Copiar Contratos */}
          <div className="space-y-6">
            {(() => {
              const metaFracao = metaGlobal / 100;
              const isPolo = escopo === "empresa";

              if (isPolo) {
                // Polo mode: list all polo operators whose rate is below metaGlobal
                const listPoloAbaixoMeta = (data?.porOperador ?? [])
                  .filter((op) => op.tx !== null && op.tx < metaFracao)
                  .map((op) => ({
                    email: op.login,
                    tx: op.tx,
                  }));

                listPoloAbaixoMeta.sort((a, b) => (a.tx ?? 0) - (b.tx ?? 0));

                return (
                  <div className="elevation-1 bg-card border border-border/60 rounded-xl p-6 space-y-4 flex flex-col h-fit">
                    <div>
                      <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
                        <IconUsers size={20} className="text-foreground" />
                        Polo
                      </h3>
                      <p className="ds-small text-muted-foreground mt-1">
                        {listPoloAbaixoMeta.length} operadores abaixo da meta ({metaGlobal}%)
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {listPoloAbaixoMeta.length === 0 ? (
                        <p className="ds-small text-muted-foreground text-center py-8">
                          Nenhum operador abaixo da meta.
                        </p>
                      ) : (
                        listPoloAbaixoMeta.map((item) => {
                          const displayName = item.email.includes("@") ? item.email.split("@")[0] : item.email;
                          return (
                            <div
                              key={item.email}
                              className="ds-mono-sm px-2.5 py-1 rounded border truncate text-xs flex justify-between items-center gap-1.5 bg-danger/5 border-danger/30 text-danger"
                            >
                              <span className="truncate">{displayName}</span>
                              <span className="shrink-0 font-bold">
                                taxa: {Math.round(item.tx! * 100)}%
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              }

              // Team/Equipe mode
              const operadorasComDados = new Set((data?.porOperador ?? []).map((op) => op.login.toLowerCase()));
              const semDadosCount = emailsEquipe.filter((email) => !operadorasComDados.has(email.toLowerCase())).length;

              const listOperadoresComStatus = emailsEquipe.map((email) => {
                const emailLower = email.toLowerCase();
                const match = data?.porOperador.find((op) => op.login.toLowerCase() === emailLower);
                return {
                  email,
                  tx: match?.tx ?? null,
                };
              });

              listOperadoresComStatus.sort((a, b) => {
                if (a.tx === null && b.tx !== null) return 1;
                if (a.tx !== null && b.tx === null) return -1;
                if (a.tx !== null && b.tx !== null) {
                  return a.tx - b.tx;
                }
                return a.email.localeCompare(b.email);
              });

              return (
                <div className="elevation-1 bg-card border border-border/60 rounded-xl p-6 space-y-4 flex flex-col h-fit">
                  <div>
                    <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
                      <IconUsers size={20} className="text-foreground" />
                      Equipe
                    </h3>
                    <p className="ds-small text-muted-foreground mt-1">
                      {emailsEquipe.length} operadores - {semDadosCount} sem dados
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {listOperadoresComStatus.length === 0 ? (
                      <p className="ds-small text-muted-foreground text-center py-8">
                        Nenhum operador na equipe.
                      </p>
                    ) : (
                      listOperadoresComStatus.map((item) => {
                        const isNoData = item.tx === null;
                        const isBelow = !isNoData && item.tx !== null && item.tx < metaFracao;

                        let itemStyle = "bg-muted/40 border-border/20 text-muted-foreground";
                        if (!isNoData) {
                          itemStyle = isBelow
                            ? "bg-danger/5 border-danger/30 text-danger"
                            : "bg-success/5 border-success/30 text-success";
                        }

                        const displayName = item.email.includes("@") ? item.email.split("@")[0] : item.email;

                        return (
                          <div
                            key={item.email}
                            className={[
                              "ds-mono-sm px-2.5 py-1 rounded border truncate text-xs flex justify-between items-center gap-1.5",
                              itemStyle
                            ].join(" ")}
                          >
                            <span className="truncate">{displayName}</span>
                            <span className="shrink-0 font-bold">
                              {isNoData ? "sem dados" : `taxa: ${Math.round(item.tx! * 100)}%`}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            <CopiarContratos
              escopo={escopo}
              emailsEquipe={emailsEquipe}
              porTema={data!.porTema}
              porOperador={data!.porOperador}
            />

            <ConfigMetas
              metaGlobal={metaGlobal}
              themeMetas={themeMetas}
              onSave={handleSaveMetas}
            />
          </div>
        </div>
      )}
        </div>
      </div>
    </PageTransition>
  );
}
