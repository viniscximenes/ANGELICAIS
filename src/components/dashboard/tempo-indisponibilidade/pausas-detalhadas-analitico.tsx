"use client";

import { IconClock } from "@tabler/icons-react";

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
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import type { GestorIndispLinha, PausasDetalhe } from "@/lib/d1-db/types";
import { cn } from "@/lib/utils";

type PausaKey = keyof PausasDetalhe;

/**
 * Pisos de largura (px) — NÃO são números aproximados: cada um foi medido
 * via Puppeteer, renderizando o texto real (fonte Geist Mono/Geist já
 * carregada) com as classes reais de tabela-padrao.tsx, e somando o
 * padding horizontal real da célula:
 *   piso = max(larguraTítulo + PADDING_HEADER, larguraValor + PADDING_VALOR) + folga
 *
 * Textos medidos (largura em px, arredondada pra cima):
 *   Cabeçalhos (ds-mono-sm font-bold tracking-wider uppercase):
 *     OPERADOR 63 · PAUSA 10 63 · PAUSA 20 63 · PARTICULAR 78 ·
 *     MON/TAREF 71 · TREN/REUN 71 · FEEDBACK 63 · PRÉ PAUSA 71 ·
 *     ATIVO 39 · TAKE BLIP 71 · E-MAIL 47 · INDISP. 55 · SISTEMA 55
 *   Valor mais largo possível (ds-mono-sm, "00:59:59" etc.): 58
 *   Nome mais longo da base real (d1_operadores_gestor, formatado por
 *   formatNomeDotSobrenome): "francisquele.goncalves" → 152 (ds-body font-medium)
 *
 * Padding horizontal real das células (tabela-padrao.tsx):
 *   header (px-2): 16px · valor/nome (px-3): 24px
 *
 * Folga de segurança (renderização cross-browser/zoom): 6px — já somada nos
 * pisos abaixo. O piso de cada uma das 12 colunas de dado usa o MAIOR valor
 * entre elas (de "Particular", a mais larga: 78+16=94 +6=100) — ver
 * DATA_COL_PISO_PX abaixo, e o porquê de ser uniforme, não por coluna.
 */

/** minmax(piso, 1.6fr) — peso maior que as colunas de dado, mas ainda cede
 * espaço proporcional quando o card é mais largo (não é "coluna fixa"). */
const PISO_OPERADOR_PX = 182; // 152 (nome real mais longo) + 24 (px-3) + 6

/**
 * Piso ÚNICO pras 12 colunas de dado (as 11 abaixo + Sistema): é o MAIOR
 * piso individual calculado por coluna (o de "Particular", que é o título
 * mais largo: 78+16=94, +6 de folga = 100). Todas as outras colunas
 * precisariam de piso menor, mas usar um valor uniforme é o que faz o
 * `minmax(piso,1fr)` de peso igual crescer em LARGURAS IDÊNTICAS quando
 * sobra espaço — com pisos diferentes por coluna, o grid cresce cada uma
 * pelo MESMO incremento absoluto a partir do próprio piso, então a
 * diferença de piso nunca desaparece (medido: 12px de diferença entre a
 * mais larga e a mais estreita). Com piso uniforme essa diferença é 0.
 */
const DATA_COL_PISO_PX = 100;

const COLUNAS: { key: PausaKey; label: string }[] = [
  { key: "pausa10", label: "Pausa 10" },
  { key: "pausa20", label: "Pausa 20" },
  { key: "pausaParticular", label: "Particular" },
  { key: "monOuTaref", label: "Mon/Taref" },
  { key: "trenOuReun", label: "Tren/Reun" },
  { key: "feedback", label: "Feedback" },
  { key: "prePausa", label: "Pré Pausa" },
  { key: "ativo", label: "Ativo" },
  { key: "takeBlip", label: "Take Blip" },
  { key: "email", label: "E-mail" },
  { key: "indisponivel", label: "Indisp." },
];

const SISTEMA_LABEL = "Sistema";

/**
 * Nenhuma coluna "absorve" o resto: todas as 12 colunas de dado usam o
 * MESMO piso e o MESMO peso (1fr) — espaço extra é dividido igualmente
 * entre elas, sempre com a mesma largura final. A coluna Operador usa peso
 * maior (1.6fr) só pra crescer proporcionalmente mais quando sobra espaço
 * (evita ficar desproporcionalmente estreita frente às 12 colunas de dado
 * somadas), nunca pra "engolir" o resto sozinha.
 */
const GRID_COLS = [
  `minmax(${PISO_OPERADOR_PX}px, 1.6fr)`,
  ...COLUNAS.map(() => `minmax(${DATA_COL_PISO_PX}px, 1fr)`),
  `minmax(${DATA_COL_PISO_PX}px, 1fr)`,
].join(" ");

/** Soma dos pisos — largura mínima total da tabela (documentação/validação, não consumida). */
export const PAUSAS_TABELA_MIN_WIDTH_PX =
  PISO_OPERADOR_PX + (COLUNAS.length + 1) * DATA_COL_PISO_PX;

function fmt(s: string): string {
  if (!s || s === "00:00:00") return "—";
  return s;
}

/** Fundo opaco da coluna Operador (sticky) no cabeçalho — mesma mistura de tokens já usada nos outros cabeçalhos sticky do projeto (color-mix, sem cor hardcoded). */
const STICKY_HEADER_BG = "color-mix(in oklch, var(--muted) 40%, var(--card))";

/**
 * Cor dos títulos desta tabela: mesma família/peso/tamanho/tracking/caixa
 * de TABELA_HEADER_CLASS (que já usa text-muted-foreground), mas um cinza
 * AINDA mais claro — via opacidade do próprio token (sem hex hardcoded),
 * pedido explicitamente pra esta tabela ser mais discreta que as outras.
 */
const PAUSAS_HEADER_COR_CLASS = "text-muted-foreground/70";

interface Props {
  operadores: GestorIndispLinha[];
}

/**
 * Tabela de consulta (sem hover/clique/dialog) — mesmo padrão visual de
 * TempoIndispTabela/EquipeTable: reaproveita as constantes de
 * tabela-padrao.tsx (container, cabeçalho, célula de valor, célula de
 * nome) em vez de classes/paddings soltos. Nome sempre REAL (sem nome
 * fantasia) — regra do analítico.
 */
export function PausasDetalhadasAnalitico({ operadores }: Props) {
  const comDados = operadores.filter((op) => op.indisponibilidade !== null);

  if (comDados.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconClock size={20} className="text-foreground" />
          Tabela de Pausas Detalhadas
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento de todas as pausas registradas por operador no período.
        </p>
      </div>

      <StyledCard className="p-3" withGradient>
        <div className={TABELA_CONTAINER_CLASS}>
          {/*
            overflow-x-auto: rede de segurança pra quando o card é mais
            estreito que a soma dos pisos — mesma técnica de
            TempoIndispTabela. Sem border-l-2/transform em lugar nenhum:
            esta tabela não tem hover, não precisa reservar folga nenhuma.
          */}
          <div className="overflow-x-auto scrollbar-tema">
            <div data-pausas-tabela className="min-w-fit">
              <div
                className={cn(TABELA_HEADER_CLASS, PAUSAS_HEADER_COR_CLASS)}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
              >
                {/*
                  sticky left-0: mesma coluna Operador acompanha o scroll
                  horizontal. Fundo opaco (STICKY_HEADER_BG) — sem isso, o
                  texto das colunas de trás apareceria por baixo ao rolar.
                  Centralizado (TABELA_HEADER_CELL_CLASS já é text-center)
                  — mesmo alinhamento do cabeçalho "Operador" da tabela
                  unificada de operadores.
                  whitespace-nowrap (herdado de TABELA_HEADER_CELL_CLASS):
                  título NUNCA quebra linha — o piso da coluna garante que o
                  texto sempre cabe.
                */}
                <div
                  className={cn(TABELA_HEADER_CELL_CLASS, "sticky left-0 z-10")}
                  style={{ background: STICKY_HEADER_BG }}
                >
                  Operador
                </div>
                {COLUNAS.map((col) => (
                  <div key={col.key} className={TABELA_HEADER_CELL_CLASS}>
                    {col.label}
                  </div>
                ))}
                <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>{SISTEMA_LABEL}</div>
              </div>

              {comDados.map((op, idx) => {
                const isLast = idx === comDados.length - 1;
                const sistemaVal = fmt(op.pausas.sistema);
                const sistemaVazio = sistemaVal === "—";

                return (
                  <div
                    key={op.email}
                    className={TABELA_LINHA_CLASS}
                    style={{
                      gridTemplateColumns: GRID_COLS,
                      borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                    }}
                  >
                    {/*
                      Fundo opaco var(--card) — mesma cor de base que o
                      StyledCard usa pro card (o gradiente de withGradient é
                      um detalhe sutil por cima disso), o bastante pra
                      cobrir o conteúdo das colunas que passam por baixo ao
                      rolar. Sem zebra (fundo uniforme) — mesmo padrão da
                      tabela de operadores quando não há estado semântico
                      (aqui nunca há, de propósito). whitespace-nowrap
                      (herdado de TABELA_NOME_CELL_CLASS) + piso calculado
                      pelo maior nome real da base: nome NUNCA é cortado.
                    */}
                    <div
                      className={cn(TABELA_NOME_CELL_CLASS, "sticky left-0 z-10")}
                      style={{ background: "var(--card)" }}
                    >
                      {formatNomeDotSobrenome(op.email)}
                    </div>
                    {COLUNAS.map((col) => {
                      const val = fmt(op.pausas[col.key]);
                      const isEmpty = val === "—";
                      return (
                        <div
                          key={col.key}
                          className={cn(
                            TABELA_VALOR_CELL_CLASS,
                            isEmpty ? "text-muted-foreground" : "text-foreground",
                          )}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {val}
                        </div>
                      );
                    })}
                    {/*
                      min-w-0 (sem overflow-hidden/ellipsis: valores desta
                      coluna nunca precisam cortar, o piso já garante que
                      cabem) — mesma classe de valor das demais colunas,
                      sem border-r por ser a última.
                    */}
                    <div
                      className={cn(
                        "ds-mono-sm min-w-0 whitespace-nowrap px-3 py-2 text-center",
                        sistemaVazio ? "text-muted-foreground" : "text-foreground",
                      )}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {sistemaVal}
                    </div>
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
