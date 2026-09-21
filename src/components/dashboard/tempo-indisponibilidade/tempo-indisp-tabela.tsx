"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";
import { OlhoToggleButton } from "@/components/gestor/olho-toggle-button";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { resolverNomeExibicao } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import {
  corNomeOperador,
  fundoLinhaRuim,
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_BULLET_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemantico,
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";

import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

const NO_FANTASIA: NomeFantasiaSerial = { ativo: false, mapa: {} };

/**
 * Larguras das 8 colunas. As 7 primeiras são FIXAS em px — mesma técnica de
 * EquipeTable (BASE_COLUMN_WIDTHS_PX em equipe-table.tsx): cada valor foi
 * calibrado pra caber o título INTEIRO em uma linha só, sem ellipsis.
 *
 * A ÚLTIMA ("Outras Pausas %") usa `minmax(widthPx, 1fr)` em vez de um px
 * fixo: com todas as 8 fixas, quando o card era mais largo que a soma
 * nominal (1190/1192px), sobrava um vão vazio à direita — a última coluna
 * terminava antes da borda do card, mesmo com título/valor corretamente
 * centralizados UM EM RELAÇÃO AO OUTRO (o vão não pertencia a nenhuma
 * coluna, então "centralizado" não bastava, precisava estar centralizado
 * na área visível da coluna). Com `1fr`, ela absorve o espaço restante do
 * card (nenhuma outra coluna precisa ficar maluca de fr — as 7 primeiras
 * continuam com o mesmo comportamento "nunca corta título" de antes).
 * `widthPx` nela vira só o MÍNIMO (a rede de segurança do overflow-x-auto
 * continua valendo abaixo desse mínimo, ver ScreenTable).
 */
const COLUNAS = [
  { label: "Operador", widthPx: 200 },
  { label: "Tempo Logado", widthPx: 150 },
  { label: "Login", widthPx: 110 },
  { label: "Logout", widthPx: 140 },
  { label: "Indisp. %", widthPx: 120 },
  { label: "NR17 %", widthPx: 110 },
  { label: "Pausa Particular %", widthPx: 190 },
  { label: "Outras Pausas %", widthPx: 170 },
] as const;

/**
 * Soma das larguras MÍNIMAS — usada pelo wrapper offscreen do PNG
 * (tempo-indisp-section.tsx) pra dimensionar a captura. O PNG usa um
 * container de largura FIXA (não responsivo como a tela), então ali o
 * `1fr` da última coluna resolve pro próprio mínimo (não sobra espaço pra
 * distribuir) — a soma nominal continua sendo a largura exata necessária,
 * sem cortar nem sobrar.
 */
export const TEMPO_INDISP_TABELA_WIDTH_PX = COLUNAS.reduce((sum, c) => sum + c.widthPx, 0);

const GRID_COLS = COLUNAS.map((c, idx) =>
  idx === COLUNAS.length - 1 ? `minmax(${c.widthPx}px, 1fr)` : `${c.widthPx}px`,
).join(" ");

/**
 * Altura mínima das linhas — NÃO dá pra derivar 100% de tabela-padrao.tsx:
 * EquipeTable (consolidado) não define uma altura explícita nem ali nem em
 * nenhuma constante compartilhada; a altura "extra" das linhas dele vem de
 * CONTEÚDO, não de classe — a célula "Tx Retenção" empilha DOIS elementos
 * (texto ds-mono-sm + barrinha de progresso `h-1`, com `gap-1` entre eles,
 * via flex-col) em vez de um só, e como a tabela é CSS Grid, a altura de
 * TODA a linha é ditada pela célula mais alta. Nenhuma das nossas 8
 * colunas tem um segundo elemento assim (inventar uma barra decorativa em
 * Tempo Logado/Indisp.% só pra empatar a altura seria UI nova, fora do que
 * foi pedido) — por isso travo a altura aqui, LOCAL a este arquivo, não em
 * tabela-padrao.tsx (compartilhado com EquipeTable — uma constante errada
 * lá mudaria a aparência do consolidado, e não posso alterá-lo).
 *
 * Cálculo (parcialmente derivado, parcialmente estimado):
 *   - py-2 do padrão de célula (TABELA_VALOR_CELL_CLASS/TABELA_VALOR_BULLET_CLASS
 *     em tabela-padrao.tsx) = 0.5rem cada lado = 16px de padding — ESSE
 *     valor É derivado da constante real.
 *   - + linha de texto ds-mono-sm (~12px de fonte) + gap-1 (4px) + barra
 *     h-1 (4px) do cabeçalho Tx Retenção do EquipeTable — esses 3 números
 *     são ESTIMADOS: `.ds-mono-sm` (globals.css) não declara line-height
 *     próprio (só font-family/size/weight), então herda de um ancestral
 *     sem valor fixo conhecido sem renderizar num navegador de verdade.
 *   16 + ~14 (linha) + 4 (gap) + 4 (barra) ≈ 38px → arredondado com folga
 *   pra 44px. NÃO CONFIRMADO visualmente — comparar lado a lado com o
 *   consolidado e ajustar este número se necessário (ver [verificar] no
 *   relatório da tarefa).
 */
const LINHA_MIN_HEIGHT_PX = 44;

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return (
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function formatLogin(horaLogin: string | null): string {
  return horaLogin ?? "—";
}

function formatLogout(
  status: OperadorAnaliticoTempoIndisp["statusTL"],
  horaLogout: string | null,
): string {
  if (status === "ainda_logado") return "Ainda logado";
  if (status === "ausente") return "—";
  return horaLogout ?? "—";
}

interface TempoIndispTabelaProps {
  operadores: OperadorAnaliticoTempoIndisp[];
  variant?: "screen" | "excel";
  nomeFantasia?: NomeFantasiaSerial;
  olhoAberto?: boolean;
  onToggleOlho?: () => void;
  /** Clique na linha abre o OperadorAnaliticoDialog — sempre recebe o operador com o email REAL. */
  onRowClick?: (operador: OperadorAnaliticoTempoIndisp) => void;
}

export const TempoIndispTabela = forwardRef<HTMLDivElement, TempoIndispTabelaProps>(
  function TempoIndispTabela(
    { operadores, variant = "screen", nomeFantasia, olhoAberto, onToggleOlho, onRowClick },
    ref,
  ) {
    const cfg = nomeFantasia ?? NO_FANTASIA;
    if (variant === "excel") {
      return <ExcelTable ref={ref} operadores={operadores} nomeFantasia={cfg} />;
    }
    return (
      <ScreenTable
        ref={ref}
        operadores={operadores}
        nomeFantasia={cfg}
        olhoAberto={olhoAberto}
        onToggleOlho={onToggleOlho}
        onRowClick={onRowClick}
      />
    );
  },
);

/* ────────────────────────────────────────────────────────────────────
   SCREEN — visual padrão do site (tema escuro/claro adaptativo)
   ──────────────────────────────────────────────────────────────────── */

const ScreenTable = forwardRef<
  HTMLDivElement,
  {
    operadores: OperadorAnaliticoTempoIndisp[];
    nomeFantasia: NomeFantasiaSerial;
    olhoAberto?: boolean;
    onToggleOlho?: () => void;
    onRowClick?: (operador: OperadorAnaliticoTempoIndisp) => void;
  }
>(function ScreenTable(
  { operadores, nomeFantasia, olhoAberto, onToggleOlho, onRowClick },
  ref,
) {
  const cfgDisplay: NomeFantasiaSerial =
    olhoAberto && nomeFantasia.ativo ? { ...nomeFantasia, ativo: false } : nomeFantasia;

  return (
    <div ref={ref} className={TABELA_CONTAINER_CLASS}>
      {/*
        overflow-x-auto: quando a soma das 9 colunas fixas (COLUNAS acima)
        não cabe na largura disponível, o WRAPPER rola horizontalmente —
        nenhum título é cortado/reticenciado pra caber. min-w-fit garante
        que o grid interno nunca encolha abaixo da soma das larguras fixas.
      */}
      <div className="overflow-x-auto scrollbar-tema">
        {/*
          data-tempo-indisp-table fica AQUI (não no container externo): é o
          pai direto do header (:first-child) e das linhas — os seletores
          [data-theme="light"] em globals.css usam `> div:first-child` /
          `> div:not(:first-child)`, então o atributo precisa estar no nível
          imediatamente acima dessas linhas, não um nível externo demais
          (o wrapper de overflow-x-auto).

          pr-[2px]: folga reservada pro hover:translate-x-0.5 (2px) das
          linhas. Header e linhas são filhos DIRETOS deste mesmo elemento —
          o padding-right entra no scrollable overflow do wrapper
          overflow-x-auto acima MESMO EM REPOUSO (medido: scrollWidth sobe
          2px em relação à soma nominal das colunas), então quando uma
          linha desliza 2px pra direita no hover ela permanece DENTRO da
          área já contabilizada — scrollWidth do wrapper fica IGUAL em
          repouso e hover (confirmado via Puppeteer, sem barra nova). Sem
          isso, o transform do hover soma +2px ao scrollWidth só naquele
          instante, abrindo uma barra que suma ao tirar o mouse. Aplicado
          aqui (não em cada linha) porque este é o pai comum do cabeçalho E
          das linhas — os dois track-sets continuam com a MESMA largura
          total, preservando o alinhamento entre eles.
        */}
        <div data-tempo-indisp-table className="min-w-fit pr-[2px]">
          {/*
            Cabeçalho — MESMO estilo local de EquipeTable (consolidado), não
            TABELA_HEADER_CLASS (que é o padrão mais neutro compartilhado
            por outras tabelas): ds-body/font-bold/text-foreground/
            tracking-wide, em vez de ds-mono-sm/font-semibold/
            text-muted-foreground/tracking-wider. TABELA_HEADER_CELL_CLASS
            não declara fonte própria (só padding/alinhamento/borda), então
            as células herdam essa tipografia do container, igual em
            EquipeTable (ver comentário lá).
          */}
          {/*
            border-l-2 border-l-transparent aqui TAMBÉM (mesmo valor
            invisível das linhas, ver TABELA_LINHA_CLASS abaixo) — causa
            real do desalinhamento: com box-sizing: border-box, uma borda
            soma ao total renderizado do elemento além do que
            gridTemplateColumns define pro CONTEÚDO. As linhas ganharam
            border-l-2 (efeito hover replicado de EquipeTable), o cabeçalho
            não — cada linha ficava 2px mais larga que o cabeçalho (medido:
            1192px x 1190px), deslocando o centro de TODAS as colunas em
            2px e fazendo o wrapper preciar de scroll horizontal 2px antes
            do necessário. Sem essa simetria, nenhuma calibração de largura
            resolve — confirmado por getBoundingClientRect antes/depois.
          */}
          <div
            className="ds-body grid gap-0 border-l-2 border-l-transparent bg-muted/40 font-bold text-foreground tracking-wide uppercase"
            style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
          >
            {/*
              SEM flex (mesma lição documentada em equipe-table.tsx): o
              botão do olho é conteúdo INLINE normal depois do texto, não um
              wrapper flex ao redor dos dois — flex desloca o CONJUNTO do
              centro real usado pela célula de dado abaixo (só texto, sem
              flex), causando o header "Operador" fora do eixo das linhas.
            */}
            <div className={TABELA_HEADER_CELL_CLASS}>
              {COLUNAS[0].label}
              {onToggleOlho && nomeFantasia.ativo && (
                <OlhoToggleButton olhoAberto={!!olhoAberto} onToggle={onToggleOlho} />
              )}
            </div>
            {COLUNAS.slice(1, -1).map((col) => (
              <div key={col.label} className={TABELA_HEADER_CELL_CLASS}>
                {col.label}
              </div>
            ))}
            {/*
              SEM whitespace-normal/leading-tight aqui (nem em "Pausa
              Particular %" acima) — medido via Playwright na página real
              autenticada (1280/1440/1920px, claro e escuro): nenhum dos 8
              títulos jamais quebra linha nas larguras atuais das colunas
              (190px/170px cabem o texto inteiro numa linha só,
              `wraps: false` confirmado em todos os casos). A CAUSA real da
              altura "diferente" não era quebra de linha — era o
              `leading-tight` reduzindo o line-height desses 2 títulos
              (medido: 15.4px contra 21px dos demais), deslocando o texto
              ~3px pra cima dentro da MESMA altura de célula (41px em todos,
              sempre igual). Removido: os 8 títulos usam agora exatamente
              TABELA_HEADER_CELL_CLASS/TABELA_HEADER_CELL_ULTIMA_CLASS sem
              override, mesmo line-height, topo e baseline coincidentes.
            */}
            <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>{COLUNAS[COLUNAS.length - 1].label}</div>
          </div>

          {/* Linhas de operadores */}
          {operadores.map((op, idx) => {
            const isLast = idx === operadores.length - 1;
            const belowMetaTL = op.statusTL === "completo" && !op.cumpriuMetaTL;
            const isAusente = op.statusTL === "ausente";
            const isAindaLogado = op.statusTL === "ainda_logado";
            const semDadosIndisp = op.indisponibilidade === null;
            const acimaMetaIndisp = !semDadosIndisp && !op.cumpriuMetaIndisp;
            const ruimNaLinha = belowMetaTL || acimaMetaIndisp;

            // "Sem dados" = operador ausente nas DUAS fontes (sem registro em
            // d1_tempo_logado E sem registro em d1_indisponibilidade hoje) —
            // isAusente e semDadosIndisp já são exatamente isso (ver
            // statusDe(null,null) em get-gestor-tempo-logado.ts e
            // indisponibilidade:null em get-gestor-indisponibilidade.ts).
            // É um "E", não um "OU": diferente de EquipeTable
            // (semAtendimentos = pedidos===0 || txRetencao===null, um "OU"),
            // porque lá é UMA fonte só (d1_consolidado); aqui são DUAS
            // fontes independentes, e dado PARCIAL (só uma delas preenchida)
            // continua interativo — só a ausência nas duas desliga a linha.
            const semDados = isAusente && semDadosIndisp;
            const clicavel = Boolean(onRowClick) && !semDados;

            // Hover — mesmo efeito de EquipeTable (consolidado): translateX
            // de 2px + borda esquerda colorida (verde/vermelho conforme a
            // meta), só quando a linha é clicável. Linha "sem dados" não
            // tem hover nenhum (igual ao critério `clicavel` do
            // EquipeTable) e o wrapper offscreen do PNG (onRowClick nunca
            // passado) também fica neutro, igual antes.
            //
            // hover:translate-x-0.5 RESTAURADO — o overflow que ele causava
            // no wrapper com overflow-x-auto foi resolvido reservando a
            // folga de 2px no PAI direto das linhas (ver pr-[2px] no
            // `data-tempo-indisp-table` abaixo), não removendo o efeito.
            const hoverClass = clicavel
              ? cn(
                  "hover:translate-x-0.5",
                  ruimNaLinha ? "hover:border-l-[var(--danger)]" : "hover:border-l-[var(--success)]",
                )
              : "hover:bg-transparent hover:border-l-transparent hover:translate-x-0";

            return (
              <div
                key={op.email}
                role={clicavel ? "button" : undefined}
                tabIndex={clicavel ? 0 : undefined}
                onClick={clicavel ? () => onRowClick!(op) : undefined}
                className={cn(
                  TABELA_LINHA_CLASS,
                  "group border-l-2 border-l-transparent transition-[background-color,border-color,transform] duration-200 ease-out",
                  clicavel && "cursor-pointer",
                  hoverClass,
                )}
                style={{
                  gridTemplateColumns: GRID_COLS,
                  background: fundoLinhaRuim(ruimNaLinha) ?? "transparent",
                  borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                  opacity: isAusente ? 0.4 : 1,
                  minHeight: LINHA_MIN_HEIGHT_PX,
                }}
              >
                <div
                  className={TABELA_NOME_CELL_CLASS}
                  style={{ color: corNomeOperador({ ruim: ruimNaLinha }) }}
                >
                  {resolverNomeExibicao(op.email, cfgDisplay)}
                </div>
                <div className={TABELA_VALOR_BULLET_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {isAusente ? (
                    <ValorSemDado />
                  ) : isAindaLogado ? (
                    <span style={{ color: "var(--foreground)" }}>{op.tempoLogado}</span>
                  ) : (
                    <ValorSemantico ruim={belowMetaTL}>{op.tempoLogado}</ValorSemantico>
                  )}
                </div>
                <div
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    op.horaLogin === null ? "text-muted-foreground" : "text-foreground",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatLogin(op.horaLogin)}
                </div>
                <div
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    formatLogout(op.statusTL, op.horaLogout) === "—" ? "text-muted-foreground" : "text-foreground",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatLogout(op.statusTL, op.horaLogout)}
                </div>
                <div className={TABELA_VALOR_BULLET_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {semDadosIndisp ? (
                    <ValorSemDado />
                  ) : (
                    <ValorSemantico ruim={acimaMetaIndisp}>{fmtPct(op.indisponibilidade)}</ValorSemantico>
                  )}
                </div>
                <div
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    op.nr17Pct === null ? "text-muted-foreground" : "text-foreground",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmtPct(op.nr17Pct)}
                </div>
                <div
                  className={cn(
                    TABELA_VALOR_CELL_CLASS,
                    op.pausaParticularPct === null ? "text-muted-foreground" : "text-foreground",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmtPct(op.pausaParticularPct)}
                </div>
                {/*
                  min-w-0 overflow-hidden — mesma combinação que EquipeTable
                  usa na própria última coluna (RV Diário), sem border-r.
                  CAUSA do desalinhamento anterior: essa célula usava uma
                  classe local SEM min-w-0, enquanto o header da mesma coluna
                  (TABELA_HEADER_CELL_ULTIMA_CLASS) já tinha — como header e
                  linha são grids CSS separados, o min-width implícito
                  "auto" da célula de dado divergia do track do header
                  (mesmo bug documentado em tabela-padrao.tsx pra toda
                  célula do padrão).
                */}
                <div
                  className={cn(
                    "ds-mono-sm min-w-0 overflow-hidden px-3 py-2 text-center",
                    op.outrasPausasPct === null ? "text-muted-foreground" : "text-foreground",
                  )}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmtPct(op.outrasPausasPct)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

/* ────────────────────────────────────────────────────────────────────
   EXCEL — visual de planilha (usado só no wrapper invisível do PNG)
   ──────────────────────────────────────────────────────────────────── */

const SANS_STACK = "'Segoe UI', 'Arial', sans-serif";
const EXCEL_RED = "#c62828";
const EXCEL_RED_BG = "#ffe5e5";
const EXCEL_NEUTRAL = "#000000";
const EXCEL_MUTED = "#555555";

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
  fontVariantNumeric: "tabular-nums",
};

const EXCEL_HEADER_DIVIDER: React.CSSProperties = { borderRight: "1px solid #4a7ba6" };
const EXCEL_COL_DIVIDER: React.CSSProperties = { borderRight: "1px solid #d0d0d0" };

// Mesmos rótulos/ordem de COLUNAS (acima) — reaproveitados, não duplicados,
// pra título da tela e título do PNG nunca divergirem.
const EXCEL_HEADERS = COLUNAS.map((c) => c.label);

const ExcelTable = forwardRef<
  HTMLDivElement,
  { operadores: OperadorAnaliticoTempoIndisp[]; nomeFantasia: NomeFantasiaSerial }
>(function ExcelTable({ operadores, nomeFantasia }, ref) {
  return (
    <div
      ref={ref}
      data-tempo-indisp-table
      style={{
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #c0c0c0",
        boxShadow: "none",
        fontFamily: SANS_STACK,
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: GRID_COLS,
          background: "#1f4e78",
          borderBottom: "1px solid #1f4e78",
        }}
      >
        {EXCEL_HEADERS.map((label, idx) => (
          <div
            key={label}
            style={
              idx < EXCEL_HEADERS.length - 1
                ? { ...EXCEL_HEADER_CELL, ...EXCEL_HEADER_DIVIDER }
                : EXCEL_HEADER_CELL
            }
          >
            {label}
          </div>
        ))}
      </div>

      {/* Linhas */}
      {operadores.map((op, idx) => {
        const isLast = idx === operadores.length - 1;
        const belowMetaTL = op.statusTL === "completo" && !op.cumpriuMetaTL;
        const acimaMetaIndisp = op.indisponibilidade !== null && !op.cumpriuMetaIndisp;
        const ruimNaLinha = belowMetaTL || acimaMetaIndisp;

        return (
          <div
            key={op.email}
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              background: ruimNaLinha ? EXCEL_RED_BG : "#ffffff",
              borderBottom: isLast ? "none" : "1px solid #d0d0d0",
              minHeight: LINHA_MIN_HEIGHT_PX,
            }}
          >
            <div
              style={{
                ...EXCEL_TEXT_CELL,
                ...EXCEL_COL_DIVIDER,
                color: ruimNaLinha ? EXCEL_RED : EXCEL_NEUTRAL,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {resolverNomeExibicao(op.email, nomeFantasia)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: belowMetaTL ? EXCEL_RED : EXCEL_NEUTRAL }}>
              {op.tempoLogado || "—"}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}>
              {formatLogin(op.horaLogin)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}>
              {formatLogout(op.statusTL, op.horaLogout)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: acimaMetaIndisp ? EXCEL_RED : EXCEL_NEUTRAL }}>
              {fmtPct(op.indisponibilidade)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}>
              {fmtPct(op.nr17Pct)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, ...EXCEL_COL_DIVIDER, color: EXCEL_MUTED }}>
              {fmtPct(op.pausaParticularPct)}
            </div>
            <div style={{ ...EXCEL_TEXT_CELL, color: EXCEL_MUTED }}>{fmtPct(op.outrasPausasPct)}</div>
          </div>
        );
      })}
    </div>
  );
});
