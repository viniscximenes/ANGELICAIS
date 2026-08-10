"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageTransition } from "@/components/motion/page-transition";
import type { AderenciaData } from "@/lib/d1-db/get-aderencia";
import { saveConfigAderenciaAction } from "@/lib/gestor/config-aderencia/actions/save-config-aderencia-action";
import type { ConfigAderencia } from "@/lib/gestor/config-aderencia/types";

import { CardsResumo } from "./cards-resumo";
import { ConfigAderenciaPopover } from "./config-aderencia-popover";
import { OperadoresListaAderencia } from "./operadores-lista-aderencia";
import { formatarDia } from "./seletor-dia";
import { TabelaAderencia } from "./tabela-aderencia";

interface DashboardAderenciaProps {
  dias: string[];
  diaSelecionado: string;
  data: AderenciaData;
  gestora: string;
}

export function DashboardAderencia({
  dias,
  diaSelecionado,
  data,
  gestora,
}: DashboardAderenciaProps) {
  const router = useRouter();

  const [salvando, setSalvando] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  async function salvarConfig(config: ConfigAderencia) {
    setSalvando(true);
    try {
      const resultado = await saveConfigAderenciaAction(config);
      if (resultado.success) {
        toast.success("Configurações de aderência salvas!");
        router.refresh();
      } else {
        toast.error(resultado.error);
      }
    } catch (err) {
      console.error("[dashboard-aderencia] erro ao salvar config:", err);
      toast.error("Erro inesperado ao salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  }

  const semDias = dias.length === 0;

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                scrollbar-width: thin !important;
                scrollbar-color: var(--border) transparent !important;
              }
              html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
              }
              html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                background: transparent !important;
              }
              html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                background: var(--border) !important;
                border-radius: 4px !important;
              }
              html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                background: var(--muted-foreground) !important;
              }
            `,
          }}
        />

        <div className="mx-auto max-w-7xl space-y-8">
          <header className="border-border flex flex-col gap-2 border-b border-dashed pb-4">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Painel do Gestor
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="ds-h1">Analítico</h1>
              <span className="ds-mono-sm text-muted-foreground">
                / Tempo Logado &amp; Indisponibilidade · {gestora}
                {!semDias && <> · {formatarDia(diaSelecionado)}</>}
              </span>
            </div>
          </header>

          {semDias ? (
            <div className="elevation-1 bg-card border-border/60 flex min-h-[300px] flex-col items-center justify-center rounded-xl border p-8 text-center">
              <div className="max-w-md space-y-3">
                <h3 className="ds-h3 text-foreground font-semibold">
                  Nenhum registro de base disponível
                </h3>
                <p className="ds-body text-muted-foreground text-sm">
                  Não foi possível carregar os dados da equipe. Verifique se a base do dia (CSV do Diário de Bordo) já foi colada/atualizada no painel principal.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-end">
                <span className="ds-mono-sm text-muted-foreground text-xs">
                  {data.resumo.comDados} de {data.resumo.totalOperadores} operadores
                  com registro
                </span>
              </div>

              <CardsResumo resumo={data.resumo} />

              <div className={configOpen ? "relative z-50" : undefined}>
                <TabelaAderencia
                  operadores={data.operadores}
                  temHorario={data.temHorario}
                  toleranciaMin={data.config.toleranciaMin}
                  acoes={
                    <ConfigAderenciaPopover
                      config={data.config}
                      onSave={salvarConfig}
                      salvando={salvando}
                      onOpenChange={setConfigOpen}
                    />
                  }
                />
              </div>

              <OperadoresListaAderencia
                operadores={data.operadores}
                temHorario={data.temHorario}
                toleranciaMin={data.config.toleranciaMin}
              />
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
