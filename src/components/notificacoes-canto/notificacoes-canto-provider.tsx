"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import type { UserRole } from "@/lib/auth/get-current-user";
import { checarKpiAtualizacaoNaoVistaAction } from "@/lib/kpi/atualizacoes/checar-atualizacao-nao-vista-action";

import { CornerToast } from "./corner-toast";

/**
 * Gerenciador único do canto inferior esquerdo. Só um aviso ocupa o canto
 * por vez, com prioridade FIXA:
 *
 *   comparativo  >  kpi-atualizado
 *
 * Se o comparativo precisar aparecer com o de KPI visível, o de KPI fecha
 * na hora (já foi marcado como visto no servidor quando apareceu). Enquanto
 * o comparativo está visível, pedidos de "KPI atualizado" são ignorados.
 *
 * O aviso "KPI atualizado" também é disparado daqui: para o GESTOR, um
 * polling leve (a cada 45s, pausado com a aba em background) + uma checagem
 * ao montar (cobre o login logo após o upload).
 */

type ComparativoPedido = { onFechar: () => void };

interface NotificacoesCantoApi {
  /** Chamado pela lógica de negócio do popup de comparativo (upload D-1). */
  mostrarComparativo: (pedido: ComparativoPedido) => void;
  esconderComparativo: () => void;
  /** Uso interno (watcher) e disponível caso precise ser disparado à mão. */
  mostrarKpiAtualizado: (dataReferencia: string) => void;
}

const NotificacoesCantoContext = createContext<NotificacoesCantoApi | null>(null);

export function useNotificacoesCanto(): NotificacoesCantoApi {
  const ctx = useContext(NotificacoesCantoContext);
  if (!ctx) {
    throw new Error(
      "useNotificacoesCanto precisa estar dentro de <NotificacoesCantoProvider>",
    );
  }
  return ctx;
}

const KPI_AUTO_DISMISS_MS = 10_000;
const POLL_INTERVAL_MS = 45_000;

const LOG = "[NotificacoesCantoProvider]";

export function NotificacoesCantoProvider({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const [comparativo, setComparativo] = useState<ComparativoPedido | null>(null);
  const [kpiDataRef, setKpiDataRef] = useState<string | null>(null);

  const comparativoAtivoRef = useRef(false);
  useEffect(() => {
    comparativoAtivoRef.current = comparativo !== null;
  }, [comparativo]);

  const mostrarComparativo = useCallback((pedido: ComparativoPedido) => {
    // Comparativo vence: fecha o de KPI imediatamente e assume o canto.
    console.info(`${LOG} mostrarComparativo() — assume o canto, fecha KPI se visível.`);
    setKpiDataRef(null);
    setComparativo(pedido);
  }, []);

  const esconderComparativo = useCallback(() => {
    console.info(`${LOG} esconderComparativo().`);
    setComparativo(null);
  }, []);

  const mostrarKpiAtualizado = useCallback((dataReferencia: string) => {
    // Nunca sobrepõe o comparativo.
    if (comparativoAtivoRef.current) {
      console.info(
        `${LOG} mostrarKpiAtualizado(${dataReferencia}) IGNORADO — comparativo está ativo.`,
      );
      return;
    }
    console.info(`${LOG} mostrarKpiAtualizado(${dataReferencia}) — abrindo toast.`);
    setKpiDataRef(dataReferencia);
  }, []);

  // Auto-dismiss do "KPI atualizado" — sempre 10s, ao vivo ou no login.
  useEffect(() => {
    if (kpiDataRef === null) return;
    const id = setTimeout(() => {
      console.info(`${LOG} auto-dismiss do toast de KPI (10s).`);
      setKpiDataRef(null);
    }, KPI_AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [kpiDataRef]);

  // Rastro de qual aviso ocupa o canto a cada mudança de estado.
  useEffect(() => {
    console.info(
      `${LOG} estado do canto → ${
        comparativo ? "comparativo" : kpiDataRef ? `kpi(${kpiDataRef})` : "nenhum"
      }`,
    );
  }, [comparativo, kpiDataRef]);

  // Watcher do GESTOR: checa "tem atualização não vista?" ao montar (login)
  // e em polling leve enquanto alguma aba está aberta. A própria action
  // marca como visto assim que retorna mostrar:true.
  useEffect(() => {
    if (role !== "GESTOR") {
      console.info(`${LOG} watcher inativo — role=${role} (só GESTOR faz polling).`);
      return;
    }

    console.info(`${LOG} watcher ativo — check inicial + polling a cada ${POLL_INTERVAL_MS}ms.`);
    let cancelado = false;

    const checar = async (origem: "mount" | "polling") => {
      if (typeof document !== "undefined" && document.hidden) {
        console.info(`${LOG} check (${origem}) pulado — aba em background.`);
        return;
      }
      try {
        const r = await checarKpiAtualizacaoNaoVistaAction();
        console.info(`${LOG} check (${origem}) retornou:`, r, `| cancelado=${cancelado}`);
        if (cancelado) return;
        if (r.mostrar && r.dataReferencia) {
          mostrarKpiAtualizado(r.dataReferencia);
        }
      } catch (err) {
        console.error(`${LOG} check (${origem}) lançou:`, err);
      }
    };

    void checar("mount");
    const id = setInterval(() => void checar("polling"), POLL_INTERVAL_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [role, mostrarKpiAtualizado]);

  const handleComparativoFechar = useCallback(() => {
    setComparativo((atual) => {
      atual?.onFechar();
      return null;
    });
  }, []);

  return (
    <NotificacoesCantoContext.Provider
      value={{ mostrarComparativo, esconderComparativo, mostrarKpiAtualizado }}
    >
      {children}

      {/*
        Sem `mode="wait"`: a lógica de prioridade já garante que só um dos
        dois estados fica truthy por vez (mostrarComparativo zera o de KPI;
        mostrarKpiAtualizado desiste se o comparativo está ativo), então
        nunca há dois cards. `mode="wait"` só adicionava o risco de uma
        saída "presa" segurar a entrada do próximo card pra sempre.
      */}
      <AnimatePresence>
        {comparativo ? (
          <ComparativoCard key="comparativo" onFechar={handleComparativoFechar} />
        ) : kpiDataRef ? (
          <KpiAtualizadoCard key="kpi" dataReferencia={kpiDataRef} />
        ) : null}
      </AnimatePresence>
    </NotificacoesCantoContext.Provider>
  );
}

function ComparativoCard({ onFechar }: { onFechar: () => void }) {
  const router = useRouter();

  return (
    <CornerToast ariaLabel="Comparativo com outras equipes">
      <div className="space-y-1">
        <h2 className="ds-h3 text-foreground font-semibold">
          Comparativo com outras equipes
        </h2>
        <p className="ds-small text-muted-foreground">
          Dá uma olhada em como sua equipe está em relação às outras hoje.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onFechar}>
          Agora não
        </Button>
        <Button
          size="sm"
          onClick={() => router.push("/operacao/comparativo-consolidado")}
        >
          Ver comparativo
        </Button>
      </div>
    </CornerToast>
  );
}

function KpiAtualizadoCard({ dataReferencia }: { dataReferencia: string }) {
  return (
    <CornerToast ariaLabel="KPI atualizado">
      <div className="space-y-1">
        <h2 className="ds-h3 text-foreground font-semibold">KPI atualizado</h2>
        <p className="ds-small text-muted-foreground">
          Os dados de KPI dos operadores foram atualizados até o dia{" "}
          {formatDateBR(dataReferencia)}.
        </p>
      </div>
    </CornerToast>
  );
}
