"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import {
  corNomeOperador,
  fundoLinhaRuim,
  TABELA_CONTAINER_CLASS,
  ValorSemantico,
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";
import { cn } from "@/lib/utils";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import type { OperadorTma } from "@/lib/tma/get-gestor-tma";
import { TmaDetalheDialog } from "./tma-detalhe-dialog";

export type TmaLinha = OperadorTma & {
  nomeExibicao: string;
};

interface TmaTableProps {
  linhas: TmaLinha[];
  atendimentosPorOperador: Record<string, AtendimentoTma[]>;
  headerButton?: ReactNode;
}

// Uma única fonte de verdade pra largura das colunas — o <colgroup> abaixo é
// compartilhado por <thead> e <tbody> (mesma <table>), então header e dados
// NUNCA podem desalinhar por width computada separadamente em cada linha.
const COLS: { label: string; width: string }[] = [
  { label: "Operador", width: "13%" },
  { label: "TMA", width: "9%" },
  { label: "Qtd. Ligações", width: "10%" },
  { label: "Outros", width: "8%" },
  { label: "Crítico", width: "8%" },
  { label: "Mud. Endereço", width: "10%" },
  { label: "Financeiro", width: "9%" },
  { label: "Qualidade", width: "9%" },
  { label: "Concorrência", width: "10%" },
  { label: "Hotline + Churn", width: "14%" },
];

const THEAD_ROW_CLASS =
  "ds-mono-sm text-muted-foreground font-bold tracking-wider uppercase bg-muted/40";
const TH_CLASS =
  "px-3 py-2.5 text-center border-r border-border/50 last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis";
const TD_CLASS = "ds-mono-sm px-3 py-2 text-center border-r border-border/30 last:border-r-0";

function quedaValores(linha: TmaLinha): number[] {
  return [
    linha.qtdOutros,
    linha.qtdCriticos,
    linha.qtdMudEndereco,
    linha.qtdFinanceiro,
    linha.qtdQualidade,
    linha.qtdConcorrencia,
    linha.qtdHotlineChurn,
  ];
}

export function TmaTable({ linhas, atendimentosPorOperador, headerButton }: TmaTableProps) {
  const [operadorAberto, setOperadorAberto] = useState<TmaLinha | null>(null);

  return (
    <>
      <div className={cn(TABELA_CONTAINER_CLASS, "overflow-x-auto")}>
        <table
          className="w-full border-collapse"
          style={{ tableLayout: "fixed", minWidth: "1080px" }}
        >
          <colgroup>
            {COLS.map((c) => (
              <col key={c.label} style={{ width: c.width }} />
            ))}
          </colgroup>

          <thead>
            <tr className={THEAD_ROW_CLASS} style={{ borderBottom: "1px solid var(--border)" }}>
              <th className={TH_CLASS}>
                <span className="inline-flex items-center justify-center gap-1.5">
                  <span>Operador</span>
                  {headerButton}
                </span>
              </th>
              {COLS.slice(1).map((c) => (
                <th key={c.label} className={TH_CLASS}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {linhas.map((linha, idx) => {
              const isLast = idx === linhas.length - 1;
              const semDado = linha.qtdAtendimentos === 0 || linha.tmaSegundos === null;
              const ruim = !semDado && linha.status === "danger";

              return (
                <tr
                  key={linha.operatorEmail}
                  onClick={() => setOperadorAberto(linha)}
                  className="group cursor-pointer transition-colors hover:bg-muted/40"
                  style={{
                    background: fundoLinhaRuim(ruim),
                    borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                    opacity: semDado ? 0.65 : 1,
                  }}
                >
                  <td
                    className={cn(TD_CLASS, "ds-body truncate font-medium group-hover:underline")}
                    style={{ color: corNomeOperador({ semDado, ruim }) }}
                  >
                    {linha.nomeExibicao}
                  </td>
                  <td className={TD_CLASS}>
                    <span className="inline-flex items-center justify-center gap-1.5">
                      {semDado ? (
                        <ValorSemDado />
                      ) : (
                        <ValorSemantico ruim={ruim}>
                          {formatKpiValue(linha.tmaSegundos, "time")}
                        </ValorSemantico>
                      )}
                    </span>
                  </td>
                  <td className={TD_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {linha.qtdAtendimentos}
                  </td>
                  {quedaValores(linha).map((valor, i) => (
                    <td key={i} className={TD_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {valor}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TmaDetalheDialog
        operador={operadorAberto}
        atendimentos={
          operadorAberto ? atendimentosPorOperador[operadorAberto.operatorEmail] ?? [] : []
        }
        onOpenChange={(open) => {
          if (!open) setOperadorAberto(null);
        }}
      />
    </>
  );
}
