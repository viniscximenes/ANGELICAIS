"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StyledCard } from "@/components/gestor/styled-card";
import {
  type GestorIndispLinha,
  type GestorTempoLogadoLinha,
} from "@/lib/d1-db/types";

function formatTempoSegundos(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface CardsResumoAnaliticoProps {
  operadoresTempoLogado: GestorTempoLogadoLinha[];
  operadoresIndisponibilidade: GestorIndispLinha[];
}

export function CardsResumoAnalitico({
  operadoresTempoLogado,
  operadoresIndisponibilidade,
}: CardsResumoAnaliticoProps) {
  const comTempo = operadoresTempoLogado.filter((op) => op.tempoLogadoSegundos > 0);
  const tempoMedioSegundos =
    comTempo.length > 0
      ? Math.round(
          comTempo.reduce((s, op) => s + op.tempoLogadoSegundos, 0) / comTempo.length,
        )
      : 0;

  const comIndisp = operadoresIndisponibilidade.filter((op) => op.indisponibilidade !== null);
  const indispMedia =
    comIndisp.length > 0
      ? comIndisp.reduce((s, op) => s + (op.indisponibilidade as number), 0) / comIndisp.length
      : null;

  const acimaMetaTL = operadoresTempoLogado.filter((op) => op.cumpriuMeta).length;
  const abaixoMetaIndisp = operadoresIndisponibilidade.filter((op) => op.cumpriuMeta).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <BlurFade delay={0} inView>
        <StyledCard
          className="px-4 py-3.5 flex flex-col justify-center"
          withGradient
          corners="left"
        >
          <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
            Tempo Logado Médio
          </p>
          <p className="ds-display text-foreground text-2xl font-semibold tabular-nums">
            {formatTempoSegundos(tempoMedioSegundos)}
          </p>
        </StyledCard>
      </BlurFade>

      <BlurFade delay={0.06} inView>
        <StyledCard
          className="px-4 py-3.5 flex flex-col justify-center"
          withGradient
          corners="none"
        >
          <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
            % Indisponibilidade Média
          </p>
          {indispMedia === null ? (
            <p className="ds-display text-foreground text-2xl font-semibold">—</p>
          ) : (
            <p className="ds-display text-foreground flex items-baseline text-2xl font-semibold">
              <NumberTicker
                value={indispMedia}
                decimalPlaces={1}
                delay={0.16}
                className="text-foreground tracking-tight dark:text-foreground"
              />
              <span>%</span>
            </p>
          )}
        </StyledCard>
      </BlurFade>

      <BlurFade delay={0.12} inView>
        <StyledCard
          className="px-4 py-3.5 flex flex-col justify-center"
          withGradient
          corners="none"
        >
          <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
            Operadores dentro da meta TL
          </p>
          <p className="ds-display text-foreground flex items-baseline text-2xl font-semibold">
            <NumberTicker
              value={acimaMetaTL}
              decimalPlaces={0}
              delay={0.22}
              className="text-foreground tracking-tight dark:text-foreground"
            />
          </p>
        </StyledCard>
      </BlurFade>

      <BlurFade delay={0.18} inView>
        <StyledCard
          className="px-4 py-3.5 flex flex-col justify-center"
          withGradient
          corners="right"
        >
          <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
            Operadores dentro da meta Indisp.
          </p>
          <p className="ds-display text-foreground flex items-baseline text-2xl font-semibold">
            <NumberTicker
              value={abaixoMetaIndisp}
              decimalPlaces={0}
              delay={0.28}
              className="text-foreground tracking-tight dark:text-foreground"
            />
          </p>
        </StyledCard>
      </BlurFade>
    </div>
  );
}
