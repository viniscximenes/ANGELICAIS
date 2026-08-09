"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StyledCard } from "@/components/gestor/styled-card";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";

interface VisaoGeralCardsProps {
  data: VisaoGeralData;
  /**
   * Meta de 0 a 100. Os cards não colorem mais por meta (visual neutro), mas
   * a prop segue na assinatura porque o restante do dashboard — gráfico de
   * evolução, tabela de temas e de segmentos — continua usando a mesma meta.
   */
  meta: number;
}

type CardItem = {
  id: string;
  label: string;
  /** Valor numérico animado pelo NumberTicker. */
  valor: number;
  decimais: number;
  sufixo?: string;
  /** Quando false, mostra `textoVazio` no lugar do contador (ex.: TX sem dados). */
  temValor: boolean;
  textoVazio?: string;
};

export function VisaoGeralCards({ data }: VisaoGeralCardsProps) {
  const { total, retidos, cancelados, tx } = data;

  const cardItems: CardItem[] = [
    {
      id: "tx_retencao",
      label: "Taxa de Retenção",
      valor: tx !== null ? tx * 100 : 0,
      decimais: 1,
      sufixo: "%",
      temValor: tx !== null,
      textoVazio: "—",
    },
    {
      id: "total_atendimentos",
      label: "Total de pedidos",
      valor: total,
      decimais: 0,
      temValor: true,
    },
    {
      id: "retidos",
      label: "Clientes Retidos",
      valor: retidos,
      decimais: 0,
      temValor: true,
    },
    {
      id: "cancelados",
      label: "Clientes Cancelados",
      valor: cancelados,
      decimais: 0,
      temValor: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardItems.map((card, idx) => {
        const corners =
          idx === 0 ? "left" : idx === cardItems.length - 1 ? "right" : "none";

        return (
          <BlurFade key={card.id} delay={0.06 * idx} inView>
            <StyledCard
              className="px-4 py-3.5 flex flex-col justify-center"
              withGradient
              corners={corners}
            >
              <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                {card.label}
              </p>

              {!card.temValor ? (
                <p className="ds-display text-foreground text-2xl font-semibold">
                  {card.textoVazio}
                </p>
              ) : (
                <p className="ds-display text-foreground flex items-baseline text-2xl font-semibold">
                  <NumberTicker
                    value={card.valor}
                    decimalPlaces={card.decimais}
                    delay={0.06 * idx + 0.1}
                    className="text-foreground tracking-tight dark:text-foreground"
                  />
                  {card.sufixo && <span>{card.sufixo}</span>}
                </p>
              )}
            </StyledCard>
          </BlurFade>
        );
      })}
    </div>
  );
}
