"use client";

import { Fragment, useState } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import type { SegmentoResult, SegmentoItem } from "@/lib/retencao/get-por-segmento";
import { Segmentado } from "./segmentado";

interface TabelaSegmentosProps {
  segmentos: SegmentoResult;
  meta: number; // Meta de 0 a 100
  /**
   * Quando true, ocupa 100% da altura do container pai (que precisa ter
   * altura definida) e SÓ a tabela rola internamente — título e o toggle
   * Marca/Unidade ficam fixos fora do scroll. Mesmo padrão de
   * TabelaTemas/DistribuicaoQuartis, usado dentro do trilho horizontal de
   * /s/reports/consolidado (retencao-horizontal-scroll.tsx).
   */
  scrollInterno?: boolean;
}

type Aba = "marca" | "unidade";

/**
 * Maior taxa primeiro (mesma ordem da "Taxa de retenção por tema");
 * desempate: maior volume. Sem taxa (null) vai pro fim.
 */
function ordenar<T extends SegmentoItem>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    if (a.tx === null && b.tx === null) return b.total - a.total;
    if (a.tx === null) return 1;
    if (b.tx === null) return -1;
    return b.tx - a.tx || b.total - a.total;
  });
}

function formatTx(tx: number | null): string {
  return tx !== null ? `${(tx * 100).toFixed(1)}%` : "—";
}

function nomeMarca(nome: string): string {
  const upper = nome.toUpperCase();
  return upper === "MOBWIRE" ? "MOB" : upper;
}

/** "CAMPOS DOS GOYTACAZES" → "Campos dos Goytacazes" (preposições minúsculas). */
function nomeUnidade(nome: string): string {
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) =>
      i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join(" ")
    .replace(/\bAtex\b/, "ATEX")
    .replace(/\bNiu\b/, "NIU")
    .replace(/\bVip\b/, "VIP")
    .replace(/\(woc\)/i, "(WOC)");
}

const TH = "py-2.5 px-4 whitespace-nowrap";
const TD_NUM = "py-3 px-4 text-center align-middle text-xs font-medium text-foreground";
const TD_NUM_SUB = "py-2.5 px-4 text-center align-middle text-xs text-muted-foreground";
/**
 * Célula da TX RETENÇÃO: sem cor própria — a cor vem só de corTx
 * (verde/vermelho). Com text-foreground/text-muted-foreground junto, a cor
 * neutra vencia no CSS gerado e a taxa fora da meta ficava preta.
 */
const TD_TX = "py-3 px-4 text-center align-middle text-xs font-semibold";
const TD_TX_SUB = "py-2.5 px-4 text-center align-middle text-xs";

export function TabelaSegmentos({ segmentos, meta, scrollInterno = false }: TabelaSegmentosProps) {
  const [aba, setAba] = useState<Aba>("marca");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const metaFracao = meta / 100;

  const corTx = (tx: number | null) =>
    tx === null ? "text-muted-foreground" : tx < metaFracao ? "text-danger" : "text-success";
  const statusMeta = (tx: number | null) =>
    tx === null ? "sem-dado" : tx < metaFracao ? "abaixo" : "dentro";

  const vazio = aba === "marca" ? segmentos.porMarca.length === 0 : segmentos.porEstado.length === 0;

  return (
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground">Desempenho por marca e unidade</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Taxa de retenção de cada marca e de cada unidade. Em Unidade, as cidades ficam
          agrupadas por estado — clique num estado para ver as unidades.
        </p>
      </div>

      <div className={scrollInterno ? "flex max-h-full flex-col gap-4" : "space-y-4"}>
        {/* Sem linha divisória abaixo do toggle (removida a pedido). */}
        <div className={scrollInterno ? "shrink-0" : undefined}>
          <Segmentado
            ariaLabel="Agrupamento do segmento"
            grupo="segmento-aba"
            opcoes={[
              { valor: "marca", rotulo: "Marca" },
              { valor: "unidade", rotulo: "Unidade" },
            ]}
            valor={aba}
            onChange={setAba}
          />
        </div>

        <div className={scrollInterno ? "min-h-0 flex-1 overflow-auto scrollbar-tema" : "overflow-x-auto"}>
          {/* data-tabela-segmentos: cabeçalho, fundo dos subitens e bolinhas
              no mesmo visual da "Taxa de retenção por tema"
              (reports-consolidado.css). */}
          <table data-tabela-segmentos className="w-full border-collapse text-left">
            <thead>
              <tr className="select-none">
                {aba === "unidade" && <th className={`${TH} w-[40px]`} />}
                <th className={TH}>{aba === "marca" ? "Marca" : "Estado"}</th>
                <th className={`${TH} w-[110px] text-center`}>Total</th>
                <th className={`${TH} w-[110px] text-center`}>Retidos</th>
                <th className={`${TH} w-[110px] text-center`}>Cancelados</th>
                <th className={`${TH} w-[130px] text-center`}>Tx Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-border/30 divide-y">
              {vazio ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-8 text-center text-xs italic">
                    Sem dados para este segmento.
                  </td>
                </tr>
              ) : aba === "marca" ? (
                ordenar(segmentos.porMarca).map((m) => (
                  <tr key={m.nome} className="align-middle">
                    <td className="text-foreground py-3 px-4 text-xs font-semibold whitespace-nowrap" title={m.nome}>
                      {nomeMarca(m.nome)}
                    </td>
                    <td className={TD_NUM} style={{ fontVariantNumeric: "tabular-nums" }}>{m.total}</td>
                    <td className={TD_NUM} style={{ fontVariantNumeric: "tabular-nums" }}>{m.retidos}</td>
                    <td className={TD_NUM} style={{ fontVariantNumeric: "tabular-nums" }}>{m.cancelados}</td>
                    <td className={`${TD_TX} ${corTx(m.tx)}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatTx(m.tx)}
                    </td>
                  </tr>
                ))
              ) : (
                ordenar(segmentos.porEstado).map((estado) => {
                  const aberto = !!abertos[estado.uf];
                  return (
                    <Fragment key={estado.uf}>
                      <tr
                        className="group cursor-pointer align-middle"
                        onClick={() => setAbertos((prev) => ({ ...prev, [estado.uf]: !prev[estado.uf] }))}
                      >
                        <td className="py-3 px-4 text-center align-middle">
                          <div className="text-muted-foreground group-hover:text-foreground flex items-center justify-center transition-colors">
                            <IconChevronRight
                              size={16}
                              className={`transition-transform duration-200 ${aberto ? "rotate-90" : "rotate-0"}`}
                            />
                          </div>
                        </td>
                        <td className="text-foreground py-3 px-4 text-xs font-semibold whitespace-nowrap">
                          {estado.nome}
                          {estado.uf !== "??" && (
                            <span className="text-muted-foreground ml-1.5 font-normal">{estado.uf}</span>
                          )}
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            · {estado.unidades.length} {estado.unidades.length === 1 ? "unidade" : "unidades"}
                          </span>
                        </td>
                        <td className={TD_NUM} style={{ fontVariantNumeric: "tabular-nums" }}>{estado.total}</td>
                        <td className={TD_NUM} style={{ fontVariantNumeric: "tabular-nums" }}>{estado.retidos}</td>
                        <td className={TD_NUM} style={{ fontVariantNumeric: "tabular-nums" }}>{estado.cancelados}</td>
                        <td className={`${TD_TX} ${corTx(estado.tx)}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatTx(estado.tx)}
                        </td>
                      </tr>

                      {aberto &&
                        ordenar(estado.unidades).map((u) => (
                          <tr key={u.nome} data-submotivo className="align-middle">
                            <td className="py-2.5 px-4" />
                            <td className="text-muted-foreground py-2.5 px-4 pl-10 text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  data-status-meta={statusMeta(u.tx)}
                                  className="bg-muted-foreground/30 h-1.5 w-1.5 shrink-0 rounded-full"
                                />
                                <span>{nomeUnidade(u.nome)}</span>
                              </div>
                            </td>
                            <td className={TD_NUM_SUB} style={{ fontVariantNumeric: "tabular-nums" }}>{u.total}</td>
                            <td className={TD_NUM_SUB} style={{ fontVariantNumeric: "tabular-nums" }}>{u.retidos}</td>
                            <td className={TD_NUM_SUB} style={{ fontVariantNumeric: "tabular-nums" }}>{u.cancelados}</td>
                            <td className={`${TD_TX_SUB} ${corTx(u.tx)}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                              {formatTx(u.tx)}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
