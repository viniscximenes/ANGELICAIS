import type { CSSProperties } from "react";

import { foraDeOperacao } from "@/lib/kpi/analise-operadores/meta-status";
import type { PontoSerie } from "@/lib/kpi/analise-operadores/serial-types";

export type QuartilNivel = 1 | 2 | 3 | 4;

/**
 * Faixa de quartil que acompanha o gráfico de um KPI principal: um marcador
 * por mês (Q1 = melhor desempenho relativo … Q4 = pior), contra TODOS os
 * operadores da empresa. Só a posição do operador — nunca nomes/valores de
 * terceiros.
 *
 * Duas cores, os MESMOS tokens `--success`/`--danger` já usados na linha e
 * na área do gráfico (não uma paleta nova): Q1/Q2 = verde, Q3/Q4 = vermelho
 * — sóbrias (`color-mix` translúcido, mesma fórmula do resto do projeto),
 * com uma variação de intensidade dentro de cada cor pra diferenciar o par
 * (Q1 mais claro que Q2, Q3 mais claro que Q4 — coerente com "Q1 melhor,
 * Q4 pior": quanto pior, mais forte o tom). Peso e borda são o MESMO para
 * as 4 células — só a cor muda; antes Q3/Q4 destoavam com borda/negrito
 * próprios.
 */
export const ESTILO_POR_NIVEL: Record<
  QuartilNivel,
  { bg: string; fg: string; bd: string }
> = {
  // Q1/Q2 invertidos a pedido: Q1 (melhor) fica com o tom de verde mais
  // claro (menor opacidade de bg/borda), Q2 com o outro tom, um pouco mais
  // presente — antes estava com a intensidade trocada entre os dois.
  1: {
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    fg: "var(--success)",
    bd: "color-mix(in srgb, var(--success) 28%, transparent)",
  },
  2: {
    bg: "color-mix(in srgb, var(--success) 20%, transparent)",
    fg: "var(--success)",
    bd: "color-mix(in srgb, var(--success) 42%, transparent)",
  },
  3: {
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
    fg: "var(--danger)",
    bd: "color-mix(in srgb, var(--danger) 28%, transparent)",
  },
  4: {
    bg: "color-mix(in srgb, var(--danger) 20%, transparent)",
    fg: "var(--danger)",
    bd: "color-mix(in srgb, var(--danger) 42%, transparent)",
  },
};

/** Peso e borda — únicos para os 4 níveis (só a cor de `ESTILO_POR_NIVEL`
 *  muda entre eles). */
const PESO_QUARTIL = "font-semibold";

/**
 * Estado neutro — mês sem quartil, seja por estar "fora de operação"
 * (férias/afastamento/desligado) ou por não ser ranqueável/sem valor. As
 * DUAS situações usam o MESMO visual neutro (cinza, sem acento de cor):
 * antes "fora de operação" usava `--warning` (borda amarelada), o que lia
 * como um estado de erro/atenção — aqui é só "não há quartil este mês",
 * sem gravidade. O texto do `title` (tooltip nativo) continua distinguindo
 * os dois motivos.
 */
const ESTILO_NEUTRO: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--muted-foreground) 6%, transparent)",
  color: "var(--muted-foreground)",
  borderColor: "color-mix(in srgb, var(--border) 90%, transparent)",
};

/**
 * Selo compacto de um único quartil (mesma paleta/pesos da faixa acima —
 * fonte única de verdade em `ESTILO_POR_NIVEL`). Pensado para uso fora do
 * gráfico mensal (ex.: uma futura tela agregada por operador), mas hoje não
 * é importado em nenhuma outra rota.
 */
export function QuartilBadge({
  nivel,
  className = "",
}: {
  nivel: QuartilNivel;
  className?: string;
}) {
  const estilo = ESTILO_POR_NIVEL[nivel];
  return (
    <span
      className={`font-sans ${PESO_QUARTIL} inline-flex h-6 items-center justify-center rounded border px-2 text-[11px] tabular-nums ${className}`}
      style={{
        backgroundColor: estilo.bg,
        color: estilo.fg,
        borderColor: estilo.bd,
      }}
    >
      Q{nivel}
    </span>
  );
}

export function QuartilFaixa({ pontos }: { pontos: PontoSerie[] }) {
  return (
    <div className="space-y-1">
      <p className="font-sans text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Quartil no mês (Q1 melhor · Q4 pior) — vs. toda a empresa
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${pontos.length}, minmax(0, 1fr))` }}
      >
        {pontos.map((p) => {
          const nivel = p.quartil;
          const estilo = nivel ? ESTILO_POR_NIVEL[nivel] : null;
          const fora = foraDeOperacao(p.statusOperador);
          const textoFora = p.metaStatusRotulo;

          const cellStyle: CSSProperties = estilo
            ? {
                backgroundColor: estilo.bg,
                color: estilo.fg,
                borderColor: estilo.bd,
              }
            : ESTILO_NEUTRO;

          return (
            <div
              key={p.mesRef}
              className="flex flex-col items-center gap-0.5"
              title={
                nivel
                  ? `${p.label}: Q${nivel}`
                  : fora
                    ? `${p.label}: fora de operação (${textoFora ?? "afastado"})`
                    : `${p.label}: sem quartil (KPI não ranqueável ou sem valor)`
              }
            >
              <div
                className={`font-sans ${PESO_QUARTIL} flex h-6 w-full items-center justify-center rounded border text-[11px] tabular-nums`}
                style={cellStyle}
              >
                {nivel ? `Q${nivel}` : fora ? "•" : "—"}
              </div>
              <span className="text-muted-foreground text-[9px] tabular-nums">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
