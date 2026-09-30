"use client";

import { Fragment, useState } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { TABELA_LINHA_CLASS, TABELA_VALOR_CELL_CLASS } from "@/components/gestor/tabela-padrao";
import type { TemaPolo } from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";

import { Cabecalho, CelulaTx } from "./tabela-supervisores";

const GRID_TEMAS = { gridTemplateColumns: "2.2fr 1.2fr 1fr 1fr 1fr 1fr" };

/**
 * Resultado do polo por tema — tabela no padrão do Consolidado (mesmo
 * cabeçalho/células da tabela de supervisores). Clique no tema abre os
 * submotivos, com as mesmas colunas em tom mais discreto.
 */
export function CancelamentoTema({ temas, meta }: { temas: TemaPolo[]; meta: number }) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (temas.length === 0) {
    return (
      <div
        className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
        style={{ border: "1px solid var(--border)" }}
      >
        Sem atendimentos na base do dia.
      </div>
    );
  }

  const totalCancelados = temas.reduce((acc, t) => acc + t.cancelados, 0);
  const pctCanc = (c: number) => (totalCancelados > 0 ? `${((c / totalCancelados) * 100).toFixed(1)}%` : "—");

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <Cabecalho
          grid={GRID_TEMAS}
          colunas={["Tema", "Tx Retenção", "Pedidos", "Retidos", "Cancelados", "% dos canc."]}
        />
        {temas.map((t) => {
          const estaAberto = aberto === t.tema;
          return (
            <Fragment key={t.tema}>
              <button
                type="button"
                onClick={() => setAberto(estaAberto ? null : t.tema)}
                aria-expanded={estaAberto}
                className={cn(
                  TABELA_LINHA_CLASS,
                  "w-full cursor-pointer border-t border-border/40 text-left",
                  estaAberto && "bg-muted/40",
                )}
                style={GRID_TEMAS}
              >
                <div className="ds-body text-foreground relative flex min-w-0 items-center justify-center border-r border-border/30 px-8 py-2 font-medium">
                  <span className="text-muted-foreground/70 absolute left-3">
                    {estaAberto ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </span>
                  <span className="truncate">{t.tema}</span>
                </div>
                <CelulaTx tx={t.txRetencao} meta={meta} className="border-r border-border/30" />
                <div className={TABELA_VALOR_CELL_CLASS}>{t.pedidos}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{t.retidos}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{t.cancelados}</div>
                <div className={cn(TABELA_VALOR_CELL_CLASS, "!border-r-0")}>{pctCanc(t.cancelados)}</div>
              </button>

              {estaAberto &&
                t.submotivos.map((s) => {
                  const pedidos = s.retidos + s.cancelados;
                  const tx = pedidos > 0 ? s.retidos / pedidos : null;
                  return (
                    <div
                      key={s.submotivo}
                      className="bg-muted/20 grid items-center border-t border-border/30 text-xs"
                      style={GRID_TEMAS}
                    >
                      <div className="text-muted-foreground min-w-0 truncate border-r border-border/30 px-3 py-1.5 text-center">
                        {s.submotivo}
                      </div>
                      <CelulaTx tx={tx} meta={meta} className="border-r border-border/30 py-1.5" />
                      <div className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground py-1.5")}>{pedidos}</div>
                      <div className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground py-1.5")}>{s.retidos}</div>
                      <div className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground py-1.5")}>{s.cancelados}</div>
                      <div className={cn(TABELA_VALOR_CELL_CLASS, "text-muted-foreground !border-r-0 py-1.5")}>
                        {pctCanc(s.cancelados)}
                      </div>
                    </div>
                  );
                })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
