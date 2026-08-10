"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StyledCard } from "@/components/gestor/styled-card";
import type { AderenciaData } from "@/lib/d1-db/get-aderencia";

interface CardsResumoProps {
  resumo: AderenciaData["resumo"];
}

type CardItem = {
  id: string;
  label: string;
  valor: number;
  decimais: number;
  sufixo?: string;
  /** Texto fixo no lugar do contador (ex.: tempo em HH:MM:SS). */
  textoFixo?: string;
  temValor: boolean;
};

/** Segundos -> "HH:MM:SS". */
function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Quatro cards de resumo da equipe. Mesmo tratamento neutro do analítico de
 * retenção — sem cor semântica, todos com o mesmo peso visual; quem colore
 * por meta é a tabela abaixo.
 */
export function CardsResumo({ resumo }: CardsResumoProps) {
  const cards: CardItem[] = [
    {
      id: "tl_medio",
      label: "Tempo Logado Médio",
      valor: 0,
      decimais: 0,
      textoFixo: formatarTempo(resumo.tempoLogadoMedioSeg),
      temValor: resumo.comDados > 0,
    },
    {
      id: "indisp_media",
      label: "Indisponibilidade Média",
      valor: resumo.indispMediaPercent ?? 0,
      decimais: 1,
      sufixo: "%",
      temValor: resumo.indispMediaPercent !== null,
    },
    {
      id: "acima_meta_tl",
      label: "Acima da meta de TL",
      valor: resumo.acimaMetaTempoLogado,
      decimais: 0,
      sufixo: ` / ${resumo.comDados}`,
      temValor: resumo.comDados > 0,
    },
    {
      id: "dentro_meta_indisp",
      label: "Dentro da meta de Indisp.",
      valor: resumo.dentroMetaIndisp,
      decimais: 0,
      sufixo: ` / ${resumo.comDados}`,
      temValor: resumo.comDados > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const corners = idx === 0 ? "left" : idx === cards.length - 1 ? "right" : "none";

        return (
          <BlurFade key={card.id} delay={0.06 * idx} inView>
            <StyledCard
              className="flex flex-col justify-center px-4 py-3.5"
              withGradient
              corners={corners}
            >
              <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                {card.label}
              </p>

              {!card.temValor ? (
                <p className="ds-display text-foreground text-2xl font-semibold">—</p>
              ) : card.textoFixo ? (
                <p className="ds-display text-foreground text-2xl font-semibold tabular-nums">
                  {card.textoFixo}
                </p>
              ) : (
                <p className="ds-display text-foreground flex items-baseline text-2xl font-semibold">
                  <NumberTicker
                    value={card.valor}
                    decimalPlaces={card.decimais}
                    delay={0.06 * idx + 0.1}
                    className="text-foreground dark:text-foreground tracking-tight"
                  />
                  {card.sufixo && (
                    <span className="text-muted-foreground text-base">{card.sufixo}</span>
                  )}
                </p>
              )}
            </StyledCard>
          </BlurFade>
        );
      })}
    </div>
  );
}
