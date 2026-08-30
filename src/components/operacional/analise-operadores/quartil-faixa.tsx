import { foraDeOperacao } from "@/lib/kpi/analise-operadores/meta-status";
import type { PontoSerie } from "@/lib/kpi/analise-operadores/serial-types";

type QuartilNivel = 1 | 2 | 3 | 4;

/**
 * Faixa de quartil que acompanha o gráfico de um KPI principal: um marcador
 * por mês (Q1 = melhor desempenho relativo … Q4 = pior), contra TODOS os
 * operadores da empresa. Só a posição do operador — nunca nomes/valores de
 * terceiros.
 *
 * `var(--x)` inline aqui é seguro: este bloco é HTML normal (não SVG
 * serializado), o modern-screenshot resolve na captura.
 */
const ESTILO_POR_NIVEL: Record<
  QuartilNivel,
  { bg: string; fg: string; bd: string; opacity?: number }
> = {
  1: { bg: "var(--success-bg)", fg: "var(--success)", bd: "var(--success-border)" },
  2: {
    bg: "var(--success-bg)",
    fg: "var(--success)",
    bd: "var(--success-border)",
    opacity: 0.55,
  },
  3: { bg: "var(--warning-bg)", fg: "var(--warning)", bd: "var(--warning-border)" },
  4: { bg: "var(--danger-bg)", fg: "var(--danger)", bd: "var(--danger-border)" },
};

export function QuartilFaixa({ pontos }: { pontos: PontoSerie[] }) {
  return (
    <div className="space-y-1">
      <p className="ds-mono-sm text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
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
          const textoFora =
            p.statusOperador === "desligado"
              ? "Desl."
              : p.statusOperador === "afastado"
                ? "Afast."
                : null;
          return (
            <div
              key={p.mesRef}
              className="flex flex-col items-center gap-0.5"
              title={
                nivel
                  ? `${p.label}: Q${nivel}`
                  : fora
                    ? `${p.label}: fora de operação (${textoFora})`
                    : `${p.label}: sem quartil (KPI não ranqueável ou sem valor)`
              }
            >
              <div
                className="ds-mono-sm flex h-6 w-full items-center justify-center rounded border text-[11px] font-semibold tabular-nums"
                style={
                  estilo
                    ? {
                        backgroundColor: estilo.bg,
                        color: estilo.fg,
                        borderColor: estilo.bd,
                        opacity: estilo.opacity,
                      }
                    : fora
                      ? {
                          backgroundColor: "var(--warning-bg)",
                          color: "var(--warning)",
                          borderColor: "var(--warning-border)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "var(--muted-foreground)",
                          borderColor: "var(--border)",
                        }
                }
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
