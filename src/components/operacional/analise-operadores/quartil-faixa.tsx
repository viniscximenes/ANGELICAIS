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
 * Monocromático (sem verde/vermelho), a pedido: gradiente de intensidade
 * sobre `--muted` — o mesmo bege do fundo das faixas de título
 * (.kpi-evolucao-titulo-head em kpi-evolucao.css). Q1 (melhor) = tom cheio,
 * Q4 (pior) = tom mais apagado. Texto sempre `--foreground`. Peso e borda
 * são o MESMO para as 4 células — só a cor muda.
 */
export const ESTILO_POR_NIVEL: Record<
  QuartilNivel,
  { bg: string; fg: string; bd: string }
> = {
  1: {
    bg: "var(--muted)",
    fg: "var(--foreground)",
    bd: "var(--border)",
  },
  2: {
    bg: "color-mix(in srgb, var(--muted) 70%, transparent)",
    fg: "var(--foreground)",
    bd: "color-mix(in srgb, var(--border) 85%, transparent)",
  },
  3: {
    bg: "color-mix(in srgb, var(--muted) 45%, transparent)",
    fg: "var(--foreground)",
    bd: "color-mix(in srgb, var(--border) 70%, transparent)",
  },
  4: {
    bg: "color-mix(in srgb, var(--muted) 22%, transparent)",
    fg: "var(--foreground)",
    bd: "color-mix(in srgb, var(--border) 55%, transparent)",
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
