"use client";

import { useState } from "react";
import { toast } from "sonner";

import { OperadorDetalheDialog } from "@/components/dashboard/retencao/operador-detalhe-dialog";
import { VisaoGeralCards } from "@/components/dashboard/retencao/visao-geral-cards";
import type { IndicadoresGestor } from "@/lib/retencao/comparativo/get-gestores-comparativo";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { QuartilOperador } from "@/lib/retencao/get-quartil-operador";
import {
  fetchQuartilOperacaoDetalheAction,
  type QuartilOperacaoDetalheResult,
  type SupervisorQuartilResumo,
} from "@/lib/retencao/quartil-operacao/actions";
import { getEmailPrefix } from "@/lib/utils/email-variants";

import { LinhaSupervisorQuartil } from "./linha-supervisor-quartil";
import { TabelaOperadoresQ4 } from "./tabela-operadores-q4";

/** Mesmo tom do skeleton do detalhe no comparativo / Analítico do Consolidado. */
const SKELETON_BLOCO = "bg-[color-mix(in_oklab,var(--muted-foreground)_14%,transparent)]";

/**
 * Skeleton do detalhe do supervisor (enquanto
 * fetchQuartilOperacaoDetalheAction roda), no formato da tabela de
 * operadores — mesmo bloco da tabela no skeleton do comparativo.
 */
function DetalheSupervisorSkeleton() {
  return (
    <div
      className="animate-pulse space-y-2 motion-reduce:animate-none"
      aria-busy="true"
      aria-label="Carregando detalhe do supervisor"
    >
      <div className={`${SKELETON_BLOCO} h-11 w-full rounded-md`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={`${SKELETON_BLOCO} h-10 w-full rounded-md opacity-60`} />
      ))}
    </div>
  );
}

type Detalhe = NonNullable<
  Extract<QuartilOperacaoDetalheResult, { success: true }>["data"]
>;

const TOAST_CLASS = "operacao-quartil-toast";

interface QuartilSectionProps {
  gestorLogado: IndicadoresGestor & { meta: number };
  supervisores: SupervisorQuartilResumo[];
}

export function QuartilSection({ gestorLogado, supervisores }: QuartilSectionProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<Record<string, Detalhe>>({});

  // Card individual do operador (clique na linha da tabela) — mesmo
  // OperadorDetalheDialog do comparativo/Consolidado, aqui com os chips de
  // quartil. Os dados já vêm no detalhe do supervisor, sem nova busca.
  const [operadorSelecionado, setOperadorSelecionado] = useState<OperadorIndividual | null>(null);
  const [operadorQuartil, setOperadorQuartil] = useState<QuartilOperador | null>(null);
  const [operadorMeta, setOperadorMeta] = useState(0);
  const [operadorDialogOpen, setOperadorDialogOpen] = useState(false);

  function abrirOperador(detalhe: Detalhe, login: string) {
    const operador = detalhe.operadores.find((op) => op.login === login);
    if (!operador) return;
    setOperadorSelecionado(operador);
    setOperadorQuartil(detalhe.quartilPorOperador[getEmailPrefix(login)] ?? null);
    setOperadorMeta(detalhe.meta);
    setOperadorDialogOpen(true);
  }

  async function toggle(gestorId: string) {
    if (abertoId === gestorId) {
      setAbertoId(null);
      return;
    }

    setAbertoId(gestorId);

    if (detalhes[gestorId]) return;

    setCarregandoId(gestorId);
    try {
      const res = await fetchQuartilOperacaoDetalheAction(gestorId);
      if (res.success) {
        setDetalhes((prev) => ({ ...prev, [gestorId]: res.data }));
      } else {
        toast.error(res.error, { className: TOAST_CLASS });
        setAbertoId((cur) => (cur === gestorId ? null : cur));
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar o detalhe do supervisor.", { className: TOAST_CLASS });
      setAbertoId((cur) => (cur === gestorId ? null : cur));
    } finally {
      setCarregandoId((cur) => (cur === gestorId ? null : cur));
    }
  }

  return (
    <div className="space-y-6">
      {/* Bloco fixo de topo: os 4 indicadores do gestor logado (igual ao comparativo). */}
      <section className="space-y-3">
        <div data-visao-geral-cards>
          <VisaoGeralCards
            data={{
              total: gestorLogado.pedidos,
              retidos: gestorLogado.retidos,
              cancelados: gestorLogado.cancelados,
              tx: gestorLogado.tx,
            }}
            meta={gestorLogado.meta}
            semAnimacao
          />
        </div>
      </section>

      {/* Operadores em Q4 por supervisor */}
      <section className="space-y-3">
        {supervisores.map((s) => {
          const detalhe = detalhes[s.id];
          return (
            <LinhaSupervisorQuartil
              key={s.id}
              resumo={s}
              meta={gestorLogado.meta}
              aberto={abertoId === s.id}
              carregando={carregandoId === s.id}
              onToggle={() => toggle(s.id)}
            >
              {detalhe ? (
                <TabelaOperadoresQ4
                  operadores={detalhe.operadores}
                  meta={detalhe.meta}
                  onOperadorClick={(login) => abrirOperador(detalhe, login)}
                />
              ) : (
                <DetalheSupervisorSkeleton />
              )}
            </LinhaSupervisorQuartil>
          );
        })}
      </section>

      {/*
        Marcador do tema do Consolidado: o OperadorDetalheDialog roda em
        portal e lê a fonte/cores do primeiro [data-page="reports-consolidado"]
        do DOM — mesmo recurso do comparativo.
      */}
      <span data-page="reports-consolidado" hidden aria-hidden="true" />

      <OperadorDetalheDialog
        operador={operadorSelecionado}
        nomeExibido={
          operadorSelecionado
            ? operadorSelecionado.login.split("@")[0] || operadorSelecionado.login
            : ""
        }
        open={operadorDialogOpen}
        onOpenChange={setOperadorDialogOpen}
        meta={operadorMeta}
        quartil={operadorQuartil}
      />
    </div>
  );
}
