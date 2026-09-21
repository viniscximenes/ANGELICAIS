"use client";

import { IconClockCheck } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import {
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";
import {
  buildForecastPorOperador,
  calcularAderenciaOperador,
} from "@/lib/d1-db/calcular-aderencia";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { cn } from "@/lib/utils";

import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

/**
 * Tolerância FIXA deste card — 10 minutos para mais e para menos, conforme
 * pedido explicitamente pra esta tabela. É INDEPENDENTE de
 * config_aderencia.toleranciaMin (o valor configurável que o
 * OperadorAnaliticoDialog usa hoje — atualmente também 10 por default, mas
 * ajustável pelo gestor na engrenagem). Este card não lê nem altera essa
 * config; usa sempre 10, hardcoded.
 *
 * Exportada: reaproveitada por pausas-nao-realizadas-analitico.tsx (não usa
 * tolerância, mas documenta o mesmo horizonte) e por
 * aderencia-equipe-analitico.tsx (agregado da mesma tolerância) — nenhum
 * dos dois recalcula ou redefine esse número, só importam esta constante.
 */
export const ADERENCIA_CARD_TOLERANCIA_MIN = 10;

/** Piso do Operador (sticky) — mesmo valor/metodologia reaproveitado pelos outros cards com coluna Operador (nome real mais longo da base, "francisquele.goncalves"). */
export const PISO_OPERADOR_PX_COMPARTILHADO = 182;

/** Texto de observação abaixo do título — informa a regra de tolerância deste card. */
const ADERENCIA_OBSERVACAO_TEXTO =
  "Aderência avaliada com tolerância de 10 minutos para mais ou para menos em cada horário (login e pausas).";

/**
 * Pisos de largura (px) — medição real via Puppeteer dos textos reais
 * (fonte/tracking reais) + padding das células de tabela-padrao.tsx, mesma
 * metodologia de pausas-detalhadas-analitico.tsx.
 *
 * Cabeçalhos medidos (ds-mono-sm font-bold tracking-wider uppercase):
 *   OPERADOR 63 · LOGIN PREV. 86 · LOGIN REAL 78 ·
 *   PAUSA 10 PREV. 110 · PAUSA 10 REAL 102 ·
 *   PAUSA 20 PREV. 110 · PAUSA 20 REAL 102
 * Valor mais largo ("08:00"): 36. Padding: header (px-2) 16px, valor/nome
 * (px-3) 24px.
 *
 * Operador: 152 (nome real mais longo, "francisquele.goncalves") + 24 + 6 = 182.
 * Colunas de dado: piso ÚNICO (maior necessário) = 110 (maior título,
 * "Pausa 10/20 Prev.") + 16 (padding header) + 6 (folga) = 132 — o valor
 * (36+24=60) fica bem abaixo, o título manda. Piso único (não por coluna)
 * pelo mesmo motivo já documentado nas tabelas irmãs: com pisos diferentes
 * por coluna, o espaço extra do `minmax(piso,1fr)` nunca reequilibra a
 * diferença inicial entre elas.
 */
const PISO_OPERADOR_PX = 182;
const DATA_COL_PISO_PX = 132;

const COLUNAS_HORARIO: { key: 0 | 1 | 2 | 3; sufixo: "Prev." | "Real" }[] = [
  { key: 0, sufixo: "Prev." },
  { key: 0, sufixo: "Real" },
  { key: 1, sufixo: "Prev." },
  { key: 1, sufixo: "Real" },
  { key: 2, sufixo: "Prev." },
  { key: 2, sufixo: "Real" },
  { key: 3, sufixo: "Prev." },
  { key: 3, sufixo: "Real" },
];

/**
 * "Pausa 10" pras duas pausas de 10 min (key 1 e key 3) — mesmo nome nas
 * duas, sem "Seg."/"2ª" no cabeçalho; a ORDEM das colunas (1ª antes da 2ª)
 * já diferencia qual é qual, sem precisar de sufixo no título.
 */
const LABELS_ITEM: Record<0 | 1 | 2 | 3, string> = {
  0: "Login",
  1: "Pausa 10",
  2: "Pausa 20",
  3: "Pausa 10",
};

/** Colunas cuja célula "Real" recebe cor semântica (dentro/fora da tolerância) — Login fica de fora, sem cor, como já era. */
const COLUNAS_COM_COR: Set<0 | 1 | 2 | 3> = new Set([1, 2, 3]);

/** Fundo opaco da coluna Operador (sticky) no cabeçalho — mesma técnica já usada em pausas-detalhadas-analitico.tsx. */
const STICKY_HEADER_BG = "color-mix(in oklch, var(--muted) 40%, var(--card))";

const GRID_COLS = [
  `minmax(${PISO_OPERADOR_PX}px, 1.6fr)`,
  ...COLUNAS_HORARIO.map(() => `minmax(${DATA_COL_PISO_PX}px, 1fr)`),
].join(" ");

/** Soma dos pisos — largura mínima total da tabela (documentação, não consumida). */
export const ADERENCIA_TABELA_MIN_WIDTH_PX = PISO_OPERADOR_PX + COLUNAS_HORARIO.length * DATA_COL_PISO_PX;

interface Props {
  operadores: OperadorAnaliticoTempoIndisp[];
  /** Mesmo Map já construído uma vez em TempoIndispSection (buildForecastPorOperador) — não recalculado aqui. */
  forecastPorOperador: ReturnType<typeof buildForecastPorOperador>;
}

/**
 * Card "Aderência" — mesma apresentação visual do card "Evolução de Taxa e
 * Pedidos da Equipe" do consolidado (StyledCard com cantoneiras, título com
 * ícone + texto de observação abaixo), mas com uma tabela (não gráfico):
 * uma linha por operador, comparando horário previsto x real de Login e das
 * 3 pausas que já entram na aderência do dialog hoje (calcularAderenciaOperador,
 * de @/lib/d1-db/calcular-aderencia — REAPROVEITADA aqui, chamada uma vez
 * por operador, exatamente como já é chamada uma vez pro operador
 * selecionado no dialog).
 *
 * Sem coluna de situação textual: a aderência de cada pausa (exceto Login)
 * é representada só pela cor do valor na célula "Real" — reaproveita
 * item.dentroTolerancia (já calculado por calcularAderenciaOperador com
 * ADERENCIA_CARD_TOLERANCIA_MIN=10), sem nenhuma lógica de comparação nova.
 *
 * Tabela só de consulta: sem hover, sem clique, sem popup — mesmo padrão de
 * PausasDetalhadasAnalitico. Sem rolagem vertical interna: cresce na
 * vertical até mostrar todas as linhas (o trilho que contém este card usa
 * RetencaoHorizontalScroll com `dynamicHeight`, que faz a section crescer
 * pro tamanho real do conteúdo em vez de cortar).
 */
export function AderenciaAnalitico({ operadores, forecastPorOperador }: Props) {
  const linhas = operadores
    .map((op) => {
      const aderencia = calcularAderenciaOperador(
        op.email,
        {
          login: op.horaLogin,
          pausa10Primeira: op.pausa10PrimeiraHora,
          pausa20: op.pausa20Hora,
          pausa10Segunda: op.pausa10SegundaHora,
        },
        forecastPorOperador,
        ADERENCIA_CARD_TOLERANCIA_MIN,
      );
      return { op, aderencia };
    })
    .filter(({ aderencia }) => aderencia.forecast !== null);

  if (linhas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
            <IconClockCheck size={20} className="text-foreground" />
            Aderência
          </h3>
          <p className="ds-small text-muted-foreground mt-1">{ADERENCIA_OBSERVACAO_TEXTO}</p>
        </div>
      </div>

      <StyledCard className="p-3" withGradient>
        <div className={TABELA_CONTAINER_CLASS}>
          {/*
            overflow-x-auto: rede de segurança horizontal (mesmo padrão de
            PausasDetalhadasAnalitico/TabelaTemas) — INDEPENDENTE do
            overflow-y-auto acima, que é do StyledCard pai, não deste div.
            Sem data-lenis-prevent: o consolidado (TabelaTemas,
            DistribuicaoQuartis) também não usa esse atributo em nenhuma das
            tabelas roláveis que já convivem com o trilho GSAP hoje — não
            existe esse mecanismo no projeto; confirmado sem conflito real
            via teste de wheel horizontal (ver relatório da tarefa anterior).
          */}
          <div className="overflow-x-auto scrollbar-tema">
            <div data-aderencia-tabela className="min-w-fit">
              <div
                className={TABELA_HEADER_CLASS}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
              >
                <div
                  className={cn(TABELA_HEADER_CELL_CLASS, "sticky left-0 z-10")}
                  style={{ background: STICKY_HEADER_BG }}
                >
                  Operador
                </div>
                {COLUNAS_HORARIO.map((col, i) => {
                  const isLast = i === COLUNAS_HORARIO.length - 1;
                  return (
                    <div
                      key={i}
                      className={isLast ? TABELA_HEADER_CELL_ULTIMA_CLASS : TABELA_HEADER_CELL_CLASS}
                    >
                      {LABELS_ITEM[col.key]} {col.sufixo}
                    </div>
                  );
                })}
              </div>

              {linhas.map(({ op, aderencia }, idx) => {
                const isLastLinha = idx === linhas.length - 1;

                return (
                  <div
                    key={op.email}
                    className={TABELA_LINHA_CLASS}
                    style={{
                      gridTemplateColumns: GRID_COLS,
                      borderBottom: isLastLinha ? "none" : "1px solid var(--border)/40",
                    }}
                  >
                    <div
                      className={cn(TABELA_NOME_CELL_CLASS, "sticky left-0 z-10")}
                      style={{ background: "var(--card)" }}
                    >
                      {formatNomeDotSobrenome(op.email)}
                    </div>
                    {COLUNAS_HORARIO.map((col, i) => {
                      const item = aderencia.items[col.key];
                      const val = col.sufixo === "Prev." ? item.horaForecast : item.horaReal;
                      const isEmpty = !val;
                      // Cor semântica SÓ na célula "Real" das 3 pausas
                      // pedidas (não em Login, não em "Prev.") — mesmo
                      // token/estilo de cor da tabela unificada de
                      // operadores (equipe-table.tsx: style={{color:
                      // var(--success)/var(--danger)}} direto no texto,
                      // sem fundo/ícone), reaproveitando
                      // item.dentroTolerancia já calculado (sem nova regra).
                      const aplicaCor = col.sufixo === "Real" && COLUNAS_COM_COR.has(col.key);
                      const cor = !aplicaCor || isEmpty
                        ? undefined
                        : item.dentroTolerancia === null
                          ? undefined
                          : item.dentroTolerancia
                            ? "var(--success)"
                            : "var(--danger)";
                      return (
                        <div
                          key={i}
                          className={cn(
                            TABELA_VALOR_CELL_CLASS,
                            cor ? undefined : isEmpty ? "text-muted-foreground" : "text-foreground",
                          )}
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: cor,
                            // MESMO peso que ValorSemantico usa pra valor
                            // colorido na tabela principal (tabela-padrao.tsx:
                            // fontWeight: 600 inline, não uma classe Tailwind
                            // font-*) — reaproveitado aqui, não inventado.
                            // Só quando há cor (Real dentro/fora da
                            // tolerância); "—" e valores sem cor continuam
                            // no peso normal de TABELA_VALOR_CELL_CLASS.
                            fontWeight: cor ? 600 : undefined,
                          }}
                        >
                          {val ?? "—"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </StyledCard>
    </div>
  );
}
