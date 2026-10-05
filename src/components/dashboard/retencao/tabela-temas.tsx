"use client";

import { useState, useMemo, Fragment } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import type { TemaData } from "@/lib/retencao/get-por-tema";

interface TabelaTemasProps {
  temas: TemaData[];
  metaGlobal: number;
  themeMetas: Record<string, number>;
  /**
   * Quando true, ocupa 100% da altura do container pai (que precisa ter
   * altura definida) e SÓ o corpo da tabela rola internamente — título e
   * cabeçalho da tabela ficam fixos. Usado dentro do trilho horizontal de
   * /s/reports/consolidado (retencao-horizontal-scroll.tsx): com submotivos
   * expandidos a tabela pode crescer bastante e não pode esticar a altura
   * do trilho inteiro. Não afeta o uso deste componente em
   * comparativo-consolidado-section.tsx (prop não passada lá, mantém o
   * comportamento de altura livre de sempre).
   */
  scrollInterno?: boolean;
  /** Título do card. Default = texto de sempre (comparativo). */
  titulo?: string;
  /** Subtítulo do card. Default = texto de sempre (comparativo). */
  descricao?: string;
  /** Cabeçalho da 1ª coluna. Default "Motivo" (uso de sempre). */
  rotuloColuna?: string;
  /**
   * Visual refinado — só /s/reports/consolidado liga (comparativo e /c
   * seguem iguais):
   * - hierarquia: motivo maior (text-sm semibold), submotivo menor e cinza;
   * - submotivo sem o prefixo repetido ("Problemas Financeiros / X" → "X",
   *   nome completo no tooltip);
   * - números da linha do motivo em peso normal, só a taxa em destaque;
   * - submotivos por volume (mais pedidos primeiro);
   * - cabeçalho fixo ao rolar dentro do card (com scrollInterno).
   */
  refinado?: boolean;
}

/** "Problemas Financeiros / Desempregado" → "Desempregado" (só o 1º segmento sai). */
function semPrefixo(submotivo: string): string {
  const i = submotivo.indexOf(" / ");
  return i === -1 ? submotivo : submotivo.slice(i + 3);
}

export function TabelaTemas({
  temas,
  metaGlobal,
  themeMetas,
  scrollInterno = false,
  titulo = "Retenção por Tema",
  descricao = "Clique num motivo para ver os submotivos.",
  rotuloColuna = "Motivo",
  refinado = false,
}: TabelaTemasProps) {
  const [expandedMotivos, setExpandedMotivos] = useState<Record<string, boolean>>({});

  function toggleExpand(motivo: string) {
    setExpandedMotivos((prev) => ({
      ...prev,
      [motivo]: !prev[motivo],
    }));
  }

  // Ordena automaticamente os motivos da maior para a menor taxa de retenção (tx desc)
  const sortedTemas = useMemo(() => {
    return [...temas].sort((a, b) => {
      if (a.tx === null && b.tx === null) return 0;
      if (a.tx === null) return 1;
      if (b.tx === null) return -1;
      return b.tx - a.tx;
    });
  }, [temas]);

  const getTxColor = (tx: number | null, motivo?: string) => {
    if (tx === null) return "text-muted-foreground";
    const rawMeta = (motivo && themeMetas && themeMetas[motivo] !== undefined) ? themeMetas[motivo] : metaGlobal;
    const themeMeta = Number(rawMeta);
    return tx < themeMeta / 100 ? "text-danger font-medium" : "text-success font-medium";
  };

  return (
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground">
          {titulo}
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          {descricao}
        </p>
      </div>

      {/*
        scrollInterno: SEM flex-1/h-full aqui de propósito — o card deve
        dimensionar pela altura real do conteúdo (fit-content), só limitado
        por max-h-full (o teto = altura do slot no trilho, herdada do
        wrapper pai com h-full). Poucos temas → card baixo, sem sobra vazia.
        Muitos temas (até estourar o teto) → overflow-y-auto entra em ação.
        O espaço "sobrando" abaixo do card fica no wrapper pai (sem fundo
        próprio). Container visual (StyledCard) removido a pedido — sobra
        só o wrapper de scroll/overflow, sem borda/fundo.
      */}
      <div
        className={scrollInterno ? "max-h-full overflow-y-auto scrollbar-tema" : "overflow-hidden"}
      >
        {/* Refinado + scrollInterno: sem o overflow-x-auto interno — ele vira
            o container de rolagem do sticky e o cabeçalho não fixaria. */}
        <div className={refinado && scrollInterno ? undefined : "overflow-x-auto"}>
          {/* data-tabela-temas: gancho pro CSS de página (ex.: cabeçalho
              no visual da tabela principal em reports-consolidado.css).
              data-temas-refinado: cabeçalho fixo (sticky) no CSS da página. */}
          <table
            data-tabela-temas
            data-temas-refinado={refinado || undefined}
            className="w-full text-left border-collapse"
          >
            <thead>
              {/*
                Tipografia igual ao cabeçalho da tabela principal (EquipeTable/
                tabela-padrao.tsx TABELA_HEADER_CLASS): ds-body (sans, não
                mono) + font-bold + tracking-wider uppercase, herdado pelas
                células filhas.
              */}
              <tr className="ds-body text-muted-foreground uppercase tracking-wider text-[11px] font-bold select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 text-center w-[40px] whitespace-nowrap"></th>
                <th className="py-2.5 px-4 whitespace-nowrap">
                  {rotuloColuna}
                </th>
                <th className="py-2.5 px-4 text-center w-[110px] whitespace-nowrap">
                  Total
                </th>
                <th className="py-2.5 px-4 text-center w-[110px] whitespace-nowrap">
                  Retidos
                </th>
                <th className="py-2.5 px-4 text-center w-[110px] whitespace-nowrap">
                  Cancelados
                </th>
                <th className="py-2.5 px-4 text-center w-[130px] whitespace-nowrap">
                  Tx Retenção
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedTemas.map((tema) => {
                const isExpanded = !!expandedMotivos[tema.motivo];
                const txFormatted = tema.tx !== null ? `${(tema.tx * 100).toFixed(1)}%` : "—";

                return (
                  <Fragment key={tema.motivo}>
                    {/*
                      Linha do Motivo Principal — hover:bg-accent, mesmo token
                      corrigido na tabela principal (EquipeTable, ver
                      TABELA_LINHA_HOVER_CLASS em equipe-table.tsx) em vez do
                      hover:bg-muted/10 antigo.
                    */}
                    <tr
                      className="hover:bg-accent cursor-pointer transition-colors group align-middle"
                      onClick={() => toggleExpand(tema.motivo)}
                    >
                      <td className="py-3 px-4 text-center align-middle">
                        {/*
                          flex items-center justify-center centraliza a seta
                          verticalmente com o texto da linha — antes o wrapper
                          era inline-block, sem controle de alinhamento
                          vertical próprio, dependendo só do valign herdado.
                          transition-transform + rotate: chevron único que
                          gira em vez de trocar de ícone, transição mais clara
                          entre aberto/fechado.
                        */}
                        <div className="flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                          <IconChevronRight
                            size={16}
                            className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0"}`}
                          />
                        </div>
                      </td>
                      <td
                        className={`py-3 px-4 align-middle ds-body font-semibold text-foreground whitespace-nowrap ${refinado ? "text-sm" : "text-xs"}`}
                      >
                        {tema.motivo}
                      </td>
                      <td className={`py-3 px-4 text-center align-middle ds-mono-sm text-foreground ${refinado ? "text-sm !font-normal" : "text-xs font-medium"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {tema.total.toLocaleString("pt-BR")}
                      </td>
                      <td className={`py-3 px-4 text-center align-middle ds-mono-sm text-foreground ${refinado ? "text-sm !font-normal" : "text-xs font-medium"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {tema.retidos.toLocaleString("pt-BR")}
                      </td>
                      <td className={`py-3 px-4 text-center align-middle ds-mono-sm text-foreground ${refinado ? "text-sm !font-normal" : "text-xs font-medium"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {tema.cancelados.toLocaleString("pt-BR")}
                      </td>
                      <td className={`py-3 px-4 text-center align-middle ds-mono-sm font-semibold ${refinado ? "text-sm" : "text-xs"} ${getTxColor(tema.tx, tema.motivo)}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {txFormatted}
                      </td>
                    </tr>

                    {/* Submotivos em Drill-down — recuo maior + hierarquia
                        visual (texto menor, cor muted) vs. a linha-pai
                        (font-semibold text-foreground, acima). */}
                    {isExpanded && (refinado
                      ? // Por volume: mais pedidos primeiro; empate → mais cancelados.
                        [...tema.submotivos].sort((a, b) => b.total - a.total || b.cancelados - a.cancelados)
                      : tema.submotivos
                    ).map((sub) => {
                      const subTxFormatted = sub.tx !== null ? `${(sub.tx * 100).toFixed(1)}%` : "—";
                      // Mesmo critério de cor da taxa (getTxColor): meta do
                      // tema, ou a global. Só vira atributo — a cor da
                      // bolinha é aplicada pelo CSS da página que quiser.
                      const metaSub = Number(themeMetas?.[tema.motivo] ?? metaGlobal) / 100;
                      const statusSub =
                        sub.tx === null ? "sem-dado" : sub.tx < metaSub ? "abaixo" : "dentro";

                      return (
                        <tr key={sub.submotivo} data-submotivo className="bg-black/5 hover:bg-accent border-b border-border/10 transition-colors align-middle">
                          <td className="py-2.5 px-4 align-middle"></td>
                          <td
                            className={`py-2.5 px-4 pl-10 align-middle ds-body text-muted-foreground ${refinado ? "text-[13px]" : "text-sm"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                data-status-meta={statusSub}
                                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0"
                              />
                              <span title={refinado ? sub.submotivo : undefined}>
                                {refinado ? semPrefixo(sub.submotivo) : sub.submotivo}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center align-middle ds-mono-sm text-muted-foreground text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {sub.total.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2.5 px-4 text-center align-middle ds-mono-sm text-muted-foreground text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {sub.retidos.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2.5 px-4 text-center align-middle ds-mono-sm text-muted-foreground text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {sub.cancelados.toLocaleString("pt-BR")}
                          </td>
                          <td className={`py-2.5 px-4 text-center align-middle ds-mono-sm text-xs ${getTxColor(sub.tx, tema.motivo)}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                            {subTxFormatted}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
