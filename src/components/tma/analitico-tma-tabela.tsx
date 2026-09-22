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
  ValorSemDado,
} from "@/components/gestor/tabela-padrao";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { SKILL_BUCKET_LABELS, SKILL_BUCKET_ORDER, type SkillBucket } from "@/lib/tma/skills-retencao";
import { cn } from "@/lib/utils";

/**
 * Pisos de largura (px) — MESMA metodologia de PausasDetalhadasAnalitico
 * (tempo-indisponibilidade/pausas-detalhadas-analitico.tsx): piso = maior
 * texto real (título OU valor) + padding horizontal da célula + folga de
 * segurança. Rótulos de skill bucket (ds-mono-sm font-bold tracking-wider
 * uppercase, igual à referência) são mais longos que os de pausa — recalculado
 * pra eles, usando a MESMA razão ~8px/caractere que os pisos medidos da
 * referência implicam (ex.: "PARTICULAR" 78px/10 car. ≈ 7.8px/car.,
 * "TAKE BLIP" 71px/9 ≈ 7.9px/car.) — sem Puppeteer disponível nesta rodada,
 * a razão da própria referência foi aplicada ao maior rótulo daqui
 * ("HOTLINE + CHURN", 15 caracteres em caixa alta): 15×8=120 +16 (padding
 * px-2 do header) +6 (folga) = 142px. Valor mais largo possível da coluna
 * ("00:00", ds-mono-sm): 5×8=40 +24 (padding px-3 da célula de valor) +6 = 70px
 * — menor que o piso do header, que domina.
 */
const PISO_OPERADOR_PX = 182; // mesmo roster/mesmo maior nome real de PausasDetalhadasAnalitico — reaproveitado direto.
const DATA_COL_PISO_PX = 142; // piso único (uniforme) — maior rótulo, "Hotline + Churn".

const GRID_COLS = [
  `minmax(${PISO_OPERADOR_PX}px, 1.6fr)`,
  ...SKILL_BUCKET_ORDER.map(() => `minmax(${DATA_COL_PISO_PX}px, 1fr)`),
].join(" ");

/** Fundo opaco da coluna Operador (sticky) e do cabeçalho (sticky top) — mesma mistura de tokens de PausasDetalhadasAnalitico/CardRechamada. */
const STICKY_HEADER_BG = "color-mix(in oklch, var(--muted) 40%, var(--card))";

/**
 * Altura máxima antes do scroll vertical interno entrar em ação — REVERSÃO
 * intencional da decisão anterior de "zero scroll vertical" (o card crescia
 * pra caber o roster inteiro). Com o roster podendo passar de ~20 operadores
 * × 7 colunas, o card ficava alto demais dentro do slide do trilho; agora
 * ele rola por dentro, então não precisa mais esticar o slide inteiro.
 */
const MAX_HEIGHT_PX = "60vh";

interface Props {
  /** Roster completo do gestor (emails normalizados, minúsculo). */
  roster: string[];
  /** email normalizado → TMA médio (segundos) por bucket; bucket sem atendimento = null. */
  porOperadorPorBucket: Map<string, Record<SkillBucket, number | null>>;
}

/**
 * Tabela Operador × skill bucket do Analítico da TMA — baseada em
 * PausasDetalhadasAnalitico, com 3 diferenças: (1) parte do ROSTER completo
 * (getRosterOperadoresGestor via get-gestor-tma-analitico.ts), não só quem
 * tem atendimento hoje — por isso não filtra nem faz early return quando
 * vazio; (2) colunas são os 7 skill buckets (SKILL_BUCKET_ORDER/LABELS de
 * skills-retencao.ts), não categorias de pausa; (3) célula é TMA médio
 * (MM:SS via formatKpiValue) ou ValorSemDado ("—"), não HH:MM:SS de pausa.
 * Cor do cabeçalho: MESMA da tabela principal da TMA (text-foreground, não a
 * variante mais apagada text-muted-foreground/70 exclusiva da referência) —
 * pra as duas tabelas da TMA ficarem visualmente consistentes entre si.
 * Mantém: coluna Operador sticky (esquerda) com fundo opaco, scroll
 * horizontal dentro do card. Cabeçalho AGORA também sticky (top) — scroll
 * vertical interno com teto de MAX_HEIGHT_PX (ver constante acima).
 */
export function AnaliticoTmaTabela({ roster, porOperadorPorBucket }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground">Tabela de TMA por Tema</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento do TMA médio de cada operador por categoria de atendimento, na base atual.
        </p>
      </div>

      <StyledCard className="p-3" withGradient>
        <div className={TABELA_CONTAINER_CLASS}>
          <div className="overflow-x-auto overflow-y-auto scrollbar-tema" style={{ maxHeight: MAX_HEIGHT_PX }}>
            <div data-analitico-tma-tabela className="min-w-fit">
              <div
                className={cn(TABELA_HEADER_CLASS, "text-foreground sticky top-0 z-20")}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA, background: STICKY_HEADER_BG }}
              >
                <div
                  className={cn(TABELA_HEADER_CELL_CLASS, "sticky left-0 z-30")}
                  style={{ background: STICKY_HEADER_BG }}
                >
                  Operador
                </div>
                {SKILL_BUCKET_ORDER.map((bucket, idx) => (
                  <div
                    key={bucket}
                    className={
                      idx === SKILL_BUCKET_ORDER.length - 1
                        ? TABELA_HEADER_CELL_ULTIMA_CLASS
                        : TABELA_HEADER_CELL_CLASS
                    }
                  >
                    {SKILL_BUCKET_LABELS[bucket]}
                  </div>
                ))}
              </div>

              {roster.map((email, idx) => {
                const isLast = idx === roster.length - 1;
                const porBucket = porOperadorPorBucket.get(email);

                return (
                  <div
                    key={email}
                    className={TABELA_LINHA_CLASS}
                    style={{
                      gridTemplateColumns: GRID_COLS,
                      borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                    }}
                  >
                    <div
                      className={cn(TABELA_NOME_CELL_CLASS, "sticky left-0 z-10")}
                      style={{ background: "var(--card)" }}
                    >
                      {formatNomeDotSobrenome(email)}
                    </div>
                    {SKILL_BUCKET_ORDER.map((bucket) => {
                      const valor = porBucket?.[bucket] ?? null;
                      return (
                        <div
                          key={bucket}
                          className={cn(TABELA_VALOR_CELL_CLASS, "last:border-r-0")}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {valor === null ? <ValorSemDado /> : formatKpiValue(valor, "time")}
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
