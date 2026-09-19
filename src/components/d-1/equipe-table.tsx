"use client";

import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import { formatBRL } from "@/lib/rv/format-money";
import { cn } from "@/lib/utils";
import {
  corNomeOperador,
  fundoLinhaRuim,
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";

interface EquipeTableProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  variant?: "screen" | "excel";
  /** Esconde a linha de totais (EQUIPE) — usado na busca de 1 operador. */
  hideTotais?: boolean;
  headerButton?: React.ReactNode;
  /**
   * Meta de TX (fração 0-1, ex: 0.6 = 60%) usada para colorir verde/vermelho.
   * Opcional — quando omitida, mantém o comportamento histórico (60%) usado
   * pelo D-1 do operador. O painel do gestor passa a meta configurável dele.
   */
  metaTx?: number;
  /**
   * Coluna extra opcional (RV Diário), gated pelo toggle da tela.
   * Off (default): grid idêntico ao atual, sem nenhuma mudança de DOM/classes
   * nas 5 colunas existentes. Só a variante "screen" suporta — a PNG (excel)
   * não ganha essa coluna.
   */
  showRvDiario?: boolean;
  /**
   * Torna o nome do operador clicável (abre o detalhamento individual de
   * atendimentos). Omitido = nome vira texto puro, sem interação — usado no
   * clone off-screen da captura de PNG, pra não ter cursor/hover ali.
   * Recebe `emailOriginal` (e-mail canônico do roster), não o `email` de
   * exibição (que pode estar resolvido pra nome fantasia).
   */
  onOperadorClick?: (emailOriginal: string) => void;
  /**
   * Prefetch: chamados no mouseenter/mouseleave de cada linha, pra iniciar
   * a busca do detalhamento ANTES do clique completar (debounce fica a
   * cargo de quem implementa — ver GestorEquipeSection). Omitidos = sem
   * prefetch (usado no clone off-screen da captura de PNG).
   */
  onOperadorHoverStart?: (emailOriginal: string) => void;
  onOperadorHoverEnd?: () => void;
}

function formatRv(rv: number | null | undefined): string {
  if (rv === null || rv === undefined) return "—";
  return formatBRL(rv);
}

const META_TX_PADRAO = 0.6;

function formatOperatorLabel(email: string): string {
  return email.split("@")[0] || email;
}

function formatTx(tx: number | null): string {
  if (tx === null) return "—";
  return `${(tx * 100).toFixed(1)}%`;
}

function meetsMeta(tx: number, meta: number = META_TX_PADRAO): boolean {
  return Math.round(tx * 1000) >= Math.round(meta * 1000);
}

export const EquipeTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function EquipeTable(
    {
      operadores,
      equipe,
      variant = "screen",
      hideTotais,
      headerButton,
      metaTx,
      showRvDiario,
      onOperadorClick,
      onOperadorHoverStart,
      onOperadorHoverEnd,
    },
    ref,
  ) {
    if (variant === "excel") {
      return (
        <ExcelTable
          ref={ref}
          operadores={operadores}
          equipe={equipe}
          hideTotais={hideTotais}
          metaTx={metaTx}
          showRvDiario={showRvDiario}
        />
      );
    }
    return (
      <ScreenTable
        ref={ref}
        operadores={operadores}
        equipe={equipe}
        hideTotais={hideTotais}
        headerButton={headerButton}
        metaTx={metaTx}
        showRvDiario={showRvDiario}
        onOperadorClick={onOperadorClick}
        onOperadorHoverStart={onOperadorHoverStart}
        onOperadorHoverEnd={onOperadorHoverEnd}
      />
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

/** Colunas numéricas observadas pelo flash de "valor mudou" no polling de 30s. */
const COLUNAS_OBSERVADAS = ["retidos", "cancelados", "pedidos", "txRetencao"] as const;
type ColunaObservada = (typeof COLUNAS_OBSERVADAS)[number];

/** Duração do flash — igual ao valor usado no `transition` do motion abaixo. */
const FLASH_DURATION_MS = 700;

/**
 * Detecta quais células (operador+coluna) mudaram de valor entre um render e
 * outro dos MESMOS `operadores` (comparados por `emailOriginal`/`email`, não
 * por posição — assim reordenar a tabela não dispara flash à toa). Só
 * dispara a PARTIR do segundo carregamento (a primeira vez que os dados
 * chegam não deve piscar a tabela inteira).
 */
function useFlashDeAtualizacao(operadores: OperadorConsolidado[]) {
  const anteriorRef = useRef<Map<string, OperadorConsolidado> | null>(null);
  const [flashMap, setFlashMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const anterior = anteriorRef.current;
    const atual = new Map(operadores.map((op) => [op.emailOriginal ?? op.email, op]));

    if (anterior) {
      const now = Date.now();
      const novasFlashes = new Map<string, number>();

      for (const [key, op] of atual) {
        const opAnterior = anterior.get(key);
        if (!opAnterior) continue;
        for (const coluna of COLUNAS_OBSERVADAS) {
          if (opAnterior[coluna] !== op[coluna]) {
            novasFlashes.set(`${key}:${coluna}`, now);
          }
        }
      }

      if (novasFlashes.size > 0) {
        setFlashMap((old) => new Map([...old, ...novasFlashes]));
        const timer = setTimeout(() => {
          setFlashMap((old) => {
            const copia = new Map(old);
            for (const k of novasFlashes.keys()) copia.delete(k);
            return copia;
          });
        }, FLASH_DURATION_MS + 100);
        anteriorRef.current = atual;
        return () => clearTimeout(timer);
      }
    }

    anteriorRef.current = atual;
  }, [operadores]);

  return function getFlashToken(emailOriginal: string, coluna: ColunaObservada) {
    return flashMap.get(`${emailOriginal}:${coluna}`);
  };
}

/**
 * Envolve um valor com um flash breve (fade de --primary translúcido pro
 * transparente) quando `flashToken` está presente — dispara de novo toda
 * vez que o token muda, porque o `key` força o motion a remontar a partir
 * de `initial`.
 */
function FlashValue({ flashToken, children }: { flashToken?: number; children: ReactNode }) {
  if (!flashToken) return <>{children}</>;
  return (
    <motion.span
      key={flashToken}
      initial={{ backgroundColor: "color-mix(in oklch, var(--primary) 18%, transparent)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: FLASH_DURATION_MS / 1000, ease: "easeOut" }}
      style={{ display: "inline-block", borderRadius: 4, paddingInline: 4, marginInline: -4 }}
    >
      {children}
    </motion.span>
  );
}

/** Largura (px) da coluna RV Diário quando totalmente aberta. */
const RV_COLUMN_PX = 160;

/**
 * Larguras FIXAS (px) das 5 colunas que não são RV Diário — Operador,
 * Retidos, Cancelados, Pedidos, Tx Retenção. Somam 760px, a mesma largura-
 * base já usada em gestor-equipe-section.tsx (proporção 3:2:2:2:3, igual
 * ao `gridTemplateColumns` antigo em `fr`, só convertida pra pixels).
 *
 * CAUSA DO BUG "Cancelados" truncando durante a transição do toggle RV:
 * antes essas 5 colunas continuavam em `fr` (`"3fr 2fr 2fr 2fr 3fr"`), e
 * `fr` divide o espaço RESTANTE depois de descontar a largura em px da
 * coluna RV — como a largura do CONTAINER externo (gestor-equipe-
 * section.tsx, CSS transition) e a largura da coluna RV (aqui, spring do
 * motion) são DUAS animações independentes, com curvas matematicamente
 * diferentes (ease-out vs. spring), o espaço "restante" pros 12fr oscilava
 * durante a transição — em alguns frames intermediários ficava
 * momentaneamente menor que 760px, encolhendo "Cancelados" o suficiente
 * pra truncar, mesmo as duas animações tendo duração/easing parecidos.
 *
 * Fixo em pixels, essas 5 colunas NUNCA recalculam — só a 6ª (RV) anima.
 */
const BASE_COLUMN_WIDTHS_PX = [190, 127, 127, 126, 190] as const;

const ScreenTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ScreenTable(
    {
      operadores,
      equipe,
      hideTotais,
      headerButton,
      metaTx,
      showRvDiario,
      onOperadorClick,
      onOperadorHoverStart,
      onOperadorHoverEnd,
    },
    ref,
  ) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao, metaTx);
    const getFlashToken = useFlashDeAtualizacao(operadores);

    // Animação do toggle "RV Diário": em vez de pular entre duas STRINGS
    // de grid-template-columns diferentes (5 colunas ↔ 6 colunas — troca
    // que o navegador nunca anima suavemente, porque as duas listas têm
    // números de tracks diferentes e não há como interpolar entre elas),
    // a 6ª coluna SEMPRE existe no template, com largura em PIXELS
    // animada por um spring do motion — 0px quando fechada, RV_COLUMN_PX
    // quando aberta.
    //
    // useSpring(NÚMERO CRU, ...) NÃO reage a mudanças desse número em
    // renders seguintes — só re-anima quando a fonte é um MotionValue (o
    // efeito interno da lib só reconecta ao valor de origem se ele for um
    // MotionValue; um número puro só é lido UMA vez, na criação). Por isso
    // o padrão certo (mesmo já usado em NumberTicker neste projeto):
    // useMotionValue próprio, atualizado imperativamente via .set() num
    // useEffect, e o useSpring rastreia ESSE motion value.
    const rvTarget = useMotionValue(showRvDiario ? RV_COLUMN_PX : 0);
    useEffect(() => {
      rvTarget.set(showRvDiario ? RV_COLUMN_PX : 0);
    }, [showRvDiario, rvTarget]);
    const rvWidthSpring = useSpring(rvTarget, { damping: 30, stiffness: 220 });
    const [rvWidthPx, setRvWidthPx] = useState(rvWidthSpring.get());
    useEffect(() => rvWidthSpring.on("change", setRvWidthPx), [rvWidthSpring]);
    // Progresso 0→1 da animação, usado só pra opacidade do conteúdo da
    // coluna (evita texto "espremido" visível enquanto a coluna é estreita).
    const rvProgress = RV_COLUMN_PX > 0 ? rvWidthPx / RV_COLUMN_PX : 0;

    // ÚNICA fonte de verdade da largura das colunas — a 6ª (RV) usa a
    // largura animada acima; as 5 primeiras agora são PIXELS FIXOS
    // (BASE_COLUMN_WIDTHS_PX), não `fr`, exatamente pra não recalcularem
    // durante a transição do toggle (ver comentário na constante). Header/
    // linhas/totais leem a MESMA variável — se estivesse duplicada em 3
    // lugares, poderia dessincronizar (já foi causa de um bug de
    // alinhamento antes).
    const gridTemplateColumns = `${BASE_COLUMN_WIDTHS_PX.join("px ")}px ${rvWidthPx}px`;

    return (
      <div ref={ref} data-equipe-table className={TABELA_CONTAINER_CLASS}>
        {/*
          Cabeçalho Estilo Planilha — estilo de texto copiado LITERALMENTE
          do label "EQUIPE" (linha de totais, abaixo): lá o texto vem de
          `ds-body font-bold` (no <div> pai da linha) + `text-foreground
          tracking-wide` (na própria célula). `ds-body` = font-sans (a
          tabela usava `ds-mono-sm` = font-mono antes — essa troca de
          família de fonte é o que realmente muda visualmente; só ajustar
          tracking, como na rodada anterior, não bastava).
          Não mexe em TABELA_HEADER_CLASS (compartilhado por Tempo Logado/
          Indisponibilidade/TMA) — construído como classe local só aqui.
          `font-family`/`font-weight`/`color`/`letter-spacing` são
          propriedades herdadas em CSS, então basta aplicar no container:
          as células filhas (TABELA_HEADER_CELL_CLASS, sem nenhuma
          declaração de fonte própria) herdam automaticamente, sem
          precisar repetir a classe em cada uma — igual à linha EQUIPE.
        */}
        <div
          className="ds-body grid gap-0 bg-muted/40 font-bold text-foreground tracking-wide uppercase"
          style={{
            ...TABELA_HEADER_BORDA,
            gridTemplateColumns,
          }}
        >
          {/*
            CAUSA RAIZ do desalinhamento do header "Operador" (histórico):
            a célula já foi `flex justify-center` com 2 filhos (texto +
            headerButton) — isso centralizava o CONJUNTO, deslocando
            "Operador" do centro real usado pela célula de dados abaixo (só
            texto, centralizado por text-align puro, sem flex). Depois
            passou a ter o ícone `absolute`, mas aí o ícone ficava solto,
            sem relação visual com o texto. Solução atual: SEM flex (célula
            continua bloco + text-align, herdado de TABELA_HEADER_CELL_CLASS)
            e o ícone é um elemento INLINE normal (inline-block) logo depois
            do texto "Operador" — como os dois são conteúdo inline da MESMA
            linha, text-align:center centraliza o PAR inteiro como uma
            unidade só, igual fazia com o texto sozinho antes.
          */}
          <div className={TABELA_HEADER_CELL_CLASS}>
            Operador
            {headerButton}
          </div>
          <div className={TABELA_HEADER_CELL_CLASS}>Retidos</div>
          <div className={TABELA_HEADER_CELL_CLASS}>Cancelados</div>
          <div className={TABELA_HEADER_CELL_CLASS}>Pedidos</div>
          {/*
            border-r some quando a coluna RV está fechada (rvWidthPx ~0) —
            Tx Retenção volta a ser a última coluna visualmente nesse caso,
            igual antes de existir a coluna RV.
          */}
          <div className={cn(TABELA_HEADER_CELL_CLASS, rvWidthPx < 1 && "border-r-0")}>
            Tx Retenção
          </div>
          {/*
            Coluna RV Diário SEMPRE renderizada agora (nunca monta/desmonta)
            — só a largura do track (rvWidthPx, acima) e a opacidade do
            conteúdo animam. overflow-hidden clipa o texto enquanto a
            coluna está estreita durante a transição.
          */}
          <div
            className={cn(TABELA_HEADER_CELL_ULTIMA_CLASS, "overflow-hidden")}
            style={{ opacity: rvProgress }}
          >
            RV Diário
          </div>
        </div>

        {/* Linhas de Operadores */}
        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao, metaTx);
          const belowMeta = !semAtendimentos && !meetsM;
          const key = op.emailOriginal ?? op.email;
          const emailOriginal = op.emailOriginal ?? op.email;

          // "Sem dados" — MESMO critério já usado nesta linha pra opacidade
          // e pro placeholder da barra de tx (não é um critério novo):
          // pedidos === 0 OU txRetencao === null. Operador nessas condições
          // não tem detalhamento nenhum pra mostrar, então não deve parecer
          // clicável (sem cursor, sem hover, sem abrir o dialog).
          const clicavel = Boolean(onOperadorClick) && !semAtendimentos;

          // Hover "premium": fundo (já no TABELA_LINHA_CLASS) + borda
          // esquerda colorida condicional (verde/vermelho conforme a meta)
          // + leve translateX — só quando a linha É clicável; sem dado,
          // nenhum dos três aparece (não há ação pra sinalizar).
          const hoverClass = clicavel
            ? cn(
                "hover:translate-x-0.5",
                belowMeta ? "hover:border-l-[var(--danger)]" : "hover:border-l-[var(--success)]",
              )
            : "hover:bg-transparent hover:border-l-transparent hover:translate-x-0";

          return (
            <motion.div
              key={key}
              layout
              transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
              onClick={clicavel ? () => onOperadorClick!(emailOriginal) : undefined}
              onKeyDown={
                clicavel
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOperadorClick!(emailOriginal);
                      }
                    }
                  : undefined
              }
              role={clicavel ? "button" : undefined}
              tabIndex={clicavel ? 0 : undefined}
              title={clicavel ? "Ver detalhamento individual de atendimentos" : undefined}
              className={cn(
                TABELA_LINHA_CLASS,
                "group border-l-2 border-l-transparent transition-[background-color,border-color,transform] duration-200 ease-out",
                clicavel && "cursor-pointer",
                hoverClass,
              )}
              style={{
                background: fundoLinhaRuim(belowMeta),
                borderBottom: isLast && hideTotais ? "none" : "1px solid var(--border)/40",
                opacity: semAtendimentos ? 0.65 : 1,
                gridTemplateColumns,
              }}
            >
              {/*
                Clique abre o dialog em QUALQUER parte da linha (handler no
                motion.div acima) — o nome não tem mais onClick próprio.
                SEM sublinhado em nenhum estado (removido a pedido) — o
                hover da linha inteira (fundo + borda esquerda) já sinaliza
                clicabilidade sozinho, não precisa do nome sublinhar junto.
                Não há outro elemento interativo na linha que precisasse
                de stopPropagation.
              */}
              <div
                className={cn(TABELA_NOME_CELL_CLASS, "no-underline")}
                style={{
                  color: corNomeOperador({ semDado: semAtendimentos, ruim: belowMeta }),
                  textDecoration: "none",
                }}
              >
                {formatOperatorLabel(op.email)}
              </div>
              <div
                className={TABELA_VALOR_CELL_CLASS}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <FlashValue flashToken={getFlashToken(emailOriginal, "retidos")}>
                  {op.retidos}
                </FlashValue>
              </div>
              <div
                className={TABELA_VALOR_CELL_CLASS}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <FlashValue flashToken={getFlashToken(emailOriginal, "cancelados")}>
                  {op.cancelados}
                </FlashValue>
              </div>
              <div
                className={TABELA_VALOR_CELL_CLASS}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <FlashValue flashToken={getFlashToken(emailOriginal, "pedidos")}>
                  {op.pedidos}
                </FlashValue>
              </div>
              <div
                className={cn(
                  "ds-mono-sm min-w-0 flex flex-col items-center justify-center gap-1 px-3 py-2",
                  rvWidthPx >= 1 && "border-r border-border/30",
                )}
              >
                {semAtendimentos ? (
                  <>
                    <ValorSemDado />
                    {/*
                      Placeholder neutro do MESMO tamanho da barra abaixo —
                      sem isso, linhas sem atendimento ficavam mais "finas"
                      que as com dado (a barra só existia quando havia tx).
                    */}
                    <div
                      aria-hidden="true"
                      className="h-1 w-12 overflow-hidden rounded-full bg-muted/20"
                    />
                  </>
                ) : (
                  <>
                    <FlashValue flashToken={getFlashToken(emailOriginal, "txRetencao")}>
                      {/*
                        Sem bolinha (ValorSemantico, compartilhado com outras
                        tabelas, mantém a bolinha) — aqui só o texto colorido
                        + a barra de progresso já cobre o papel do indicador.
                      */}
                      <span
                        style={{
                          color: belowMeta ? "var(--danger)" : "var(--success)",
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatTx(op.txRetencao)}
                      </span>
                    </FlashValue>
                    {/* Barra fina de progresso da tx — dado já existe na linha, sem query nova. */}
                    <div
                      aria-hidden="true"
                      className="h-1 w-12 overflow-hidden rounded-full bg-muted/50"
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, (op.txRetencao ?? 0) * 100))}%`,
                          background: belowMeta ? "var(--danger)" : "var(--success)",
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
              <div
                className="ds-mono-sm min-w-0 overflow-hidden px-3 py-2 text-center"
                style={{ fontVariantNumeric: "tabular-nums", opacity: rvProgress }}
              >
                {formatRv(op.rvDiario)}
              </div>
            </motion.div>
          );
        })}

        {/* Linha de Totais (Equipe) - Fechamento Contábil / Excel */}
        {!hideTotais && (
          <div
            className="ds-body grid items-center gap-0 bg-muted/20 font-bold"
            style={{
              borderTop: "2px solid var(--border)",
              borderBottom: "2px double var(--border)",
              gridTemplateColumns,
            }}
          >
            <div className="min-w-0 truncate px-3 py-2.5 text-center border-r border-border/40 text-foreground tracking-wide">
              EQUIPE
            </div>
            <div
              className="min-w-0 px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.retidos}
            </div>
            <div
              className="min-w-0 px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.cancelados}
            </div>
            <div
              className="min-w-0 px-3 py-2.5 text-center border-r border-border/40"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {equipe.pedidos}
            </div>
            <div
              className={cn(
                "min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5",
                rvWidthPx >= 1 && "border-r border-border/40",
              )}
            >
              {equipe.txRetencao === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  <span
                    style={{
                      color: equipeMeets ? "var(--success)" : "var(--danger)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTx(equipe.txRetencao)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: equipeMeets
                        ? "var(--success)"
                        : "var(--danger)",
                    }}
                  />
                </>
              )}
            </div>
            <div
              className="min-w-0 overflow-hidden px-3 py-2.5 text-center"
              style={{ fontVariantNumeric: "tabular-nums", opacity: rvProgress }}
            >
              {formatRv(equipe.rvDiario)}
            </div>
          </div>
        )}
      </div>
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   EXCEL — visual de planilha (usado só no wrapper invisível do PNG)
   ──────────────────────────────────────────────────────────────────── */

// Tudo no PNG usa Segoe UI — inclusive os números (antes Consolas/monospace).
const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";

// Cores das colunas no PNG (variant excel) — legíveis sobre fundo branco.
const EXCEL_GREEN = "#2e7d32"; // retidos / tx >= 60%
const EXCEL_RED = "#c62828"; // cancelados / tx < 60%
const EXCEL_AMBER = "#ed6c02"; // pedidos (âmbar, contrasta no branco)
const EXCEL_RED_BG = "#ffe5e5"; // fundo de alerta da célula de TX < 60%
const EXCEL_NEUTRAL = "#000000"; // nome do operador / TX nula

const EXCEL_COL_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #d0d0d0",
};

const EXCEL_HEADER_DIVIDER: React.CSSProperties = {
  borderRight: "1px solid #4a7ba6",
};

const EXCEL_HEADER_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#ffffff",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const EXCEL_TEXT_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "12px",
  textAlign: "center",
};

const EXCEL_NUM_CELL: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: SANS_STACK,
  fontSize: "12px",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
};

const ExcelTable = forwardRef<HTMLDivElement, EquipeTableProps>(
  function ExcelTable({ operadores, equipe, hideTotais, metaTx, showRvDiario }, ref) {
    const equipeMeets =
      equipe.txRetencao !== null && meetsMeta(equipe.txRetencao, metaTx);
    const gridCols = showRvDiario
      ? "3fr 2fr 2fr 2fr 3fr 3fr"
      : "3fr 2fr 2fr 2fr 3fr";

    return (
      <div
        ref={ref}
        data-equipe-table
        style={{
          background: "#ffffff",
          color: "#000000",
          border: "1px solid #c0c0c0",
          boxShadow: "none",
          fontFamily: SANS_STACK,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            background: "#1f4e78",
            borderBottom: "1px solid #1f4e78",
          }}
        >
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Operador
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Retidos
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Cancelados
          </div>
          <div style={{ ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }}>
            Pedidos
          </div>
          <div
            style={
              showRvDiario
                ? { ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }
                : EXCEL_HEADER_CELL
            }
          >
            Tx Retenção
          </div>
          {showRvDiario && (
            <div style={EXCEL_HEADER_CELL}>RV Diário</div>
          )}
        </div>

        {operadores.map((op, idx) => {
          const isLast = idx === operadores.length - 1;
          const semAtendimentos = op.pedidos === 0 || op.txRetencao === null;
          const meetsM = op.txRetencao !== null && meetsMeta(op.txRetencao, metaTx);
          const belowMeta = !semAtendimentos && !meetsM;
          const key = op.emailOriginal ?? op.email;

          // TX < meta: a LINHA INTEIRA fica vermelho claro (alerta). Os números
          // mantêm a cor por coluna; o nome fica preto para legibilidade.
          const rowBg = belowMeta ? EXCEL_RED_BG : "#ffffff";
          const txColor = semAtendimentos
            ? EXCEL_NEUTRAL
            : belowMeta
              ? EXCEL_RED
              : EXCEL_GREEN;

          return (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                background: rowBg,
                borderBottom: isLast ? "none" : "1px solid #d0d0d0",
              }}
            >
              <div
                style={{
                  ...EXCEL_TEXT_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_NEUTRAL,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {formatOperatorLabel(op.email)}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_GREEN,
                }}
              >
                {op.retidos}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_RED,
                }}
              >
                {op.cancelados}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...EXCEL_COL_DIVIDER,
                  color: EXCEL_AMBER,
                }}
              >
                {op.pedidos}
              </div>
              <div
                style={{
                  ...EXCEL_NUM_CELL,
                  ...(showRvDiario ? EXCEL_COL_DIVIDER : null),
                  color: txColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {semAtendimentos ? (
                  <span>—</span>
                ) : (
                  <>
                    <span>{formatTx(op.txRetencao)}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: txColor,
                      }}
                    />
                  </>
                )}
              </div>
              {showRvDiario && (
                <div
                  style={{
                    ...EXCEL_NUM_CELL,
                    color: EXCEL_NEUTRAL,
                  }}
                >
                  {formatRv(op.rvDiario)}
                </div>
              )}
            </div>
          );
        })}

        {!hideTotais && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            // Linha de total SEMPRE cinza — nunca pinta de vermelho, mesmo com
            // TX < 60% (o alerta vermelho vale só para linhas de operador).
            background: "#f0f0f0",
            borderTop: "2px solid #808080",
            fontWeight: 600,
            color: "#000000",
          }}
        >
          <div
            style={{
              ...EXCEL_TEXT_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            EQUIPE
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
            }}
          >
            {equipe.retidos}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
            }}
          >
            {equipe.cancelados}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...EXCEL_COL_DIVIDER,
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
            }}
          >
            {equipe.pedidos}
          </div>
          <div
            style={{
              ...EXCEL_NUM_CELL,
              ...(showRvDiario ? EXCEL_COL_DIVIDER : null),
              fontWeight: 600,
              color: EXCEL_NEUTRAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {equipe.txRetencao === null ? (
              <span>—</span>
            ) : (
              <>
                <span>{formatTx(equipe.txRetencao)}</span>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: equipeMeets ? EXCEL_GREEN : EXCEL_RED,
                  }}
                />
              </>
            )}
          </div>
          {showRvDiario && (
            <div
              style={{
                ...EXCEL_NUM_CELL,
                fontWeight: 600,
                color: EXCEL_NEUTRAL,
              }}
            >
              {formatRv(equipe.rvDiario)}
            </div>
          )}
        </div>
        )}
      </div>
    );
  },
);
