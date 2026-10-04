"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { SupervisorLinha } from "@/lib/coordenador/types";
import { cn } from "@/lib/utils";
import { TABELA_HEADER_BORDA } from "@/components/gestor/tabela-padrao";

import { abaixoDaMeta, classeTx, formatTx } from "./format";

/** Abaixo disso a célula é "amostra pequena" (esmaecida). */
export const MIN_PEDIDOS_MATRIZ = 3;

export type ColunaMatriz = {
  chave: string;
  /** Texto do cabeçalho da coluna. */
  rotulo: string;
  /** Texto da coluna no tooltip (ex.: "09:00 – 09:59"). Default = rotulo. */
  rotuloTooltip?: string;
  /** Meta (0–100) usada pra colorir a coluna. Default = meta da tabela. */
  meta?: number;
};

type CelulaHover = {
  x: number;
  y: number;
  supervisor: string;
  coluna: string;
  tx: number;
  meta: number;
  retidos: number;
  cancelados: number;
};

/**
 * Tooltip da célula, em portal no body: um ancestral com transform/overflow
 * (ex.: trilho horizontal) prenderia ou cortaria um tooltip dentro da tabela.
 * O portal recebe data-page (tokens do tema) e a fonte já resolvida do
 * container real — mesma técnica do OperadorTecnicoDialog.
 */
function TooltipCelula({ info }: { info: CelulaHover }) {
  const escopo = document.querySelector<HTMLElement>('[data-page="reports-consolidado"]');
  const fontFamily = escopo ? getComputedStyle(escopo).fontFamily : undefined;
  return createPortal(
    <div
      data-page="reports-consolidado"
      role="tooltip"
      className="bg-popover border-border/80 pointer-events-none fixed z-[60] w-60 -translate-x-1/2 -translate-y-full rounded-lg border p-3 shadow-md"
      style={{ left: info.x, top: info.y - 8, fontFamily }}
    >
      <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
        {info.supervisor} · {info.coluna}
      </p>
      <p className="mt-1 text-sm">
        <span className={`font-semibold ${classeTx(info.tx, info.meta)}`}>{formatTx(info.tx)}</span>
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {info.retidos + info.cancelados} pedidos<span className="mx-2">·</span>
        {info.retidos} retidos<span className="mx-2">·</span>
        {info.cancelados} cancelados
      </p>
    </div>,
    document.body,
  );
}

/**
 * Matriz supervisor × colunas (horas, temas…) no visual do "Taxa por hora -
 * Supervisor": título + texto, cabeçalho igual ao da Tabela supervisores
 * (tema claro e tipografia em coordenador-consolidado.css,
 * [data-coord-tabela-hora]), nomes à esquerda, célula só com a taxa colorida
 * pela meta e pedidos/retidos/cancelados no tooltip do hover.
 */
export function MatrizTaxaSupervisor({
  titulo,
  descricao,
  supervisores,
  colunas,
  celula,
  meta,
}: {
  titulo: string;
  descricao: string;
  supervisores: SupervisorLinha[];
  colunas: ColunaMatriz[];
  /** Retidos/cancelados do supervisor na coluna; null = sem atendimento. */
  celula: (s: SupervisorLinha, chave: string) => { retidos: number; cancelados: number } | null;
  meta: number;
}) {
  const [hover, setHover] = useState<CelulaHover | null>(null);

  // Rolar a página move a tabela — o tooltip, fixo na tela, ficaria solto na
  // posição antiga. Some ao rolar.
  useEffect(() => {
    if (!hover) return;
    const fechar = () => setHover(null);
    window.addEventListener("scroll", fechar, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", fechar, { capture: true });
  }, [hover]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
        <p className="ds-small text-muted-foreground mt-1">{descricao}</p>
      </div>
      <div className="overflow-x-auto" onScroll={() => setHover(null)}>
        {/* table-fixed + colgroup: coluna do supervisor com largura fixa e
            as demais com a MESMA largura — células do mesmo tamanho. */}
        <table data-coord-tabela-hora className="w-full min-w-[720px] table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "10.5rem" }} />
            {colunas.map((c) => (
              <col key={c.chave} />
            ))}
          </colgroup>
          <thead>
            {/* Mesmo cabeçalho da Tabela supervisores: bg-muted/40, borda de
                baixo, divisórias border/50. */}
            <tr
              className="ds-body bg-muted/40 text-foreground font-bold tracking-wide uppercase"
              style={TABELA_HEADER_BORDA}
            >
              <th className="border-border/50 border-r px-3 py-2.5 text-left align-middle whitespace-nowrap">
                Supervisor
              </th>
              {colunas.map((c, i) => (
                <th
                  key={c.chave}
                  title={c.rotulo}
                  className={cn(
                    "truncate px-1 py-2.5 text-center align-middle whitespace-nowrap",
                    i < colunas.length - 1 && "border-border/50 border-r",
                  )}
                >
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {supervisores.map((s) => (
              <tr key={s.gestorId}>
                {/* Nomes alinhados à esquerda (não centralizados). */}
                <td className="ds-body text-foreground truncate px-3 py-1.5 text-left font-medium">
                  {s.nome}
                </td>
                {colunas.map((c) => {
                  const cel = celula(s, c.chave);
                  const pedidos = cel ? cel.retidos + cel.cancelados : 0;
                  if (!cel || pedidos === 0) {
                    return (
                      <td key={c.chave} className="text-muted-foreground/50 p-1 text-center">
                        ·
                      </td>
                    );
                  }
                  const metaColuna = c.meta ?? meta;
                  const tx = cel.retidos / pedidos;
                  const ruim = abaixoDaMeta(tx, metaColuna);
                  const pequena = pedidos < MIN_PEDIDOS_MATRIZ;
                  return (
                    <td key={c.chave} className="p-1 text-center">
                      {/* Só a taxa; pedidos/retidos/cancelados no tooltip do hover. */}
                      <div
                        className="cursor-default rounded px-1 py-1.5"
                        style={{
                          background: `color-mix(in oklab, ${ruim ? "var(--danger)" : "var(--success)"} ${pequena ? 8 : 18}%, transparent)`,
                          opacity: pequena ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setHover({
                            x: r.left + r.width / 2,
                            y: r.top,
                            supervisor: s.nome,
                            coluna: c.rotuloTooltip ?? c.rotulo,
                            tx,
                            meta: metaColuna,
                            retidos: cel.retidos,
                            cancelados: cel.cancelados,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <span className={cn("font-semibold", ruim ? "text-danger" : "text-success")}>
                          {Math.round(tx * 100)}%
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hover && <TooltipCelula info={hover} />}
    </div>
  );
}
