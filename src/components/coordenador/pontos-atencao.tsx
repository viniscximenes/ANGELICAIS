"use client";

import type { ReactNode } from "react";
import { IconCoin, IconClockHour4, IconShieldX, IconTarget, IconTrophy, IconUsers } from "@tabler/icons-react";

import type { CoordenadorConsolidado } from "@/lib/coordenador/types";

import { formatTx } from "./format";

/**
 * Retenções a mais necessárias pra taxa chegar na meta, mantendo os pedidos
 * (cada uma = um cancelamento que precisaria ter virado retenção).
 */
export function faltamParaMeta(retidos: number, pedidos: number, meta: number): number {
  if (pedidos === 0) return 0;
  return Math.max(0, Math.ceil((meta / 100) * pedidos - retidos - 1e-9));
}

type Ponto = { id: string; icone: ReactNode; titulo: string; texto: ReactNode; tom: "danger" | "warning" | "success" };

const COR_TOM: Record<Ponto["tom"], string> = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  success: "var(--success)",
};

const TURNO_MINUSCULO = { manha: "manhã", tarde: "tarde" } as const;

/** Rótulo do bucket de hora em texto corrido: "≥ 20" → "Após 20h", "< 08" → "Até 08h". */
function formatHoraTexto(label: string): string {
  if (label === "< 08") return "Até 08h";
  if (label === "≥ 20") return "Após 20h";
  return label;
}

/** Diferença em pontos percentuais (fração) → "0.9%". */
function formatDiff(diff: number): string {
  return `${Math.abs(diff * 100).toFixed(1)}%`;
}

/** Tema do financeiro, como agrupado por normalizarTema. */
const TEMA_FINANCEIRO = "Mot. Financeiro";

export function PontosAtencao({
  dados,
  meta,
  metaFinanceiro,
}: {
  dados: CoordenadorConsolidado;
  meta: number;
  metaFinanceiro: number;
}) {
  const pontos: Ponto[] = [];

  // 1. Polo × meta
  const txPolo = dados.polo.txRetencao;
  if (txPolo !== null) {
    const diff = txPolo - meta / 100;
    const faltaPolo = faltamParaMeta(dados.polo.retidos, dados.polo.pedidos, meta);
    const naMeta = faltaPolo === 0;
    pontos.push({
      id: "meta",
      icone: <IconTarget size={18} />,
      titulo: naMeta ? "Polo na meta" : "Polo abaixo da meta",
      tom: naMeta ? "success" : "danger",
      texto: naMeta ? (
        <>
          O polo está em {formatTx(txPolo)} - {Math.abs(diff) < 0.0005 ? "na meta!" : `${formatDiff(diff)} acima da meta!`}
        </>
      ) : (
        <>
          O polo está em {formatTx(txPolo)} - {formatDiff(diff)} abaixo da meta.
        </>
      ),
    });
  }

  // 2. Equipe mais prejudicial
  const pior = [...dados.supervisores]
    .filter((s) => (s.impactoPolo ?? 0) > 0.0005)
    .sort((a, b) => (b.impactoPolo ?? 0) - (a.impactoPolo ?? 0))[0];
  if (pior) {
    pontos.push({
      id: "supervisor",
      icone: <IconUsers size={18} />,
      titulo: "Equipe mais prejudicial",
      tom: "danger",
      texto: (
        <>
          {pior.login}
          {pior.turno ? ` (${TURNO_MINUSCULO[pior.turno]})` : ""} está em {formatTx(pior.txRetencao)} e tira{" "}
          {formatDiff(pior.impactoPolo ?? 0)} do polo. {pior.abaixoDaMeta} de {pior.operadores} operadores abaixo da meta.
        </>
      ),
    });
  }

  // 3. Pior hora do dia (com volume relevante)
  const horasValidas = dados.evolucao.filter((h) => h.pedidos >= 20 && h.txRetencao !== null);
  const piorHora = [...horasValidas].sort((a, b) => (a.txRetencao ?? 1) - (b.txRetencao ?? 1))[0];
  if (piorHora) {
    pontos.push({
      id: "hora",
      icone: <IconClockHour4 size={18} />,
      titulo: "Pior hora do dia",
      tom: (piorHora.txRetencao ?? 1) < meta / 100 ? "danger" : "warning",
      texto: (
        <>
          {formatHoraTexto(piorHora.label)} fechou em {formatTx(piorHora.txRetencao)} com {piorHora.cancelados} cancelados,{" "}
          {piorHora.retidos} retidos e {piorHora.pedidos} pedidos.
        </>
      ),
    });
  }

  // 4. Taxa do financeiro × meta do financeiro (mesmo formato do card do polo)
  const fin = dados.temas.find((t) => t.tema === TEMA_FINANCEIRO);
  if (fin && fin.txRetencao !== null) {
    const diff = fin.txRetencao - metaFinanceiro / 100;
    const falta = faltamParaMeta(fin.retidos, fin.pedidos, metaFinanceiro);
    const naMeta = falta === 0;
    pontos.push({
      id: "financeiro",
      icone: <IconCoin size={18} />,
      titulo: "Taxa do financeiro",
      tom: naMeta ? "success" : "danger",
      texto: naMeta ? (
        <>
          O financeiro está em {formatTx(fin.txRetencao)} -{" "}
          {Math.abs(diff) < 0.0005 ? "na meta!" : `${formatDiff(diff)} acima da meta!`}
        </>
      ) : (
        <>
          O financeiro está em {formatTx(fin.txRetencao)} - {formatDiff(diff)} abaixo da meta.
        </>
      ),
    });
  }

  // 5. Melhor supervisor: espelho do "Equipe mais prejudicial" — a equipe
  // que mais SOMA à taxa do polo (impacto negativo = sem ela o polo cairia).
  // Pelo impacto, não só pela taxa: pesa o volume de cada equipe.
  const melhor = [...dados.supervisores]
    .filter((s) => (s.impactoPolo ?? 0) < -0.0005)
    .sort((a, b) => (a.impactoPolo ?? 0) - (b.impactoPolo ?? 0))[0];
  if (melhor) {
    pontos.push({
      id: "melhor-supervisor",
      icone: <IconTrophy size={18} />,
      titulo: "Melhor supervisor",
      tom: "success",
      texto: (
        <>
          {melhor.login}
          {melhor.turno ? ` (${TURNO_MINUSCULO[melhor.turno]})` : ""} está em {formatTx(melhor.txRetencao)} e soma{" "}
          {formatDiff(melhor.impactoPolo ?? 0)} ao polo. {melhor.operadores - melhor.abaixoDaMeta} de {melhor.operadores}{" "}
          operadores na meta.
        </>
      ),
    });
  }

  // 6. FaceID não realizado
  if (dados.faceId.naoRealizado > 0) {
    const tentativas = dados.polo.pedidos + dados.faceId.abortados;
    const supTop = [...dados.supervisores].sort((a, b) => b.faceIdNaoRealizado - a.faceIdNaoRealizado)[0];
    const pct = tentativas > 0 ? dados.faceId.naoRealizado / tentativas : 0;
    pontos.push({
      id: "faceid",
      icone: <IconShieldX size={18} />,
      titulo: "FaceID não realizado",
      tom: pct > 0.05 ? "danger" : "warning",
      texto: (
        <>
          {dados.faceId.naoRealizado} FaceID não realizado ({(pct * 100).toFixed(1)}% das tentativas).
          {supTop && supTop.faceIdNaoRealizado > 0 && (
            <>
              {" "}
              Mais em {supTop.login} ({supTop.faceIdNaoRealizado}{" "}
              {supTop.faceIdNaoRealizado === 1 ? "caso" : "casos"}).
            </>
          )}
        </>
      ),
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {pontos.map((p) => (
        <div
          key={p.id}
          className="relative flex gap-3 overflow-hidden rounded-lg border border-border bg-card/70 p-4 shadow-[var(--shadow-sm)]"
        >
          <div aria-hidden="true" className="absolute top-0 left-0 h-full w-[3px]" style={{ background: COR_TOM[p.tom] }} />
          <span className="mt-0.5 shrink-0" style={{ color: COR_TOM[p.tom] }}>
            {p.icone}
          </span>
          <div className="min-w-0">
            <p className="ds-small text-muted-foreground tracking-wider uppercase">{p.titulo}</p>
            <p className="text-foreground mt-1 text-sm leading-relaxed">{p.texto}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
