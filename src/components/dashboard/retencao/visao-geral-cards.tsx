"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StyledCard } from "@/components/gestor/styled-card";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";

interface VisaoGeralCardsProps {
  data: VisaoGeralData;
  /** Meta de 0 a 100 — usada pra colorir a Taxa de Retenção (verde/vermelho). */
  meta: number;
}

type StatSecundario = {
  id: string;
  label: string;
  valor: number;
  decimais: number;
};

/**
 * Hierarquia visual assimétrica (1 stat primário em destaque + secundários
 * menores ao redor) — mesma TÉCNICA de um bento grid de landing page, mas
 * só a técnica: cantoneiras (StyledCard), fonte monoespaçada e tokens de
 * cor do projeto continuam os mesmos, sem elementos de "card de marketing"
 * (sem rounded-3xl, sem bg-primary sólido grande, sem gráfico decorativo).
 *
 * 1 linha só (não 2, como um bento grid típico) de propósito: este card
 * vive dentro do slot de altura fixa do trilho horizontal — aumentar a
 * altura aqui reabriria os ajustes de dimensionamento já calibrados nas
 * etapas anteriores.
 */
export function VisaoGeralCards({ data, meta }: VisaoGeralCardsProps) {
  const { total, retidos, cancelados, tx } = data;

  const metaFracao = meta / 100;
  const temDadoTx = tx !== null;
  const abaixoDaMeta = temDadoTx && tx! < metaFracao;

  // Classes literais (não interpoladas) — o scanner do Tailwind precisa
  // achar a string inteira no código-fonte pra gerar a classe.
  const txClassName = !temDadoTx
    ? "tracking-tight text-foreground dark:text-foreground"
    : abaixoDaMeta
      ? "tracking-tight text-danger dark:text-danger"
      : "tracking-tight text-success dark:text-success";

  const secundarios: StatSecundario[] = [
    { id: "total_atendimentos", label: "Pedidos", valor: total, decimais: 0 },
    { id: "retidos", label: "Retidos", valor: retidos, decimais: 0 },
    { id: "cancelados", label: "Churn", valor: cancelados, decimais: 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
      {/*
        sm:items-end no grid externo: por padrão o CSS Grid estica todo
        item da linha pra altura do maior (align-items: stretch), o que
        fazia o bloco dos 3 secundários (abaixo) ficar tão alto quanto o
        card de TX Retenção. Com items-end, cada um ocupa só a própria
        altura de conteúdo e alinha pela BASE — TX Retenção continua do
        mesmo tamanho de sempre, e o bloco dos secundários (mais baixo)
        fica com a base alinhada à do TX, sobrando espaço no TOPO deles
        em vez de embaixo.
      */}
      {/* Stat primário: Taxa de Retenção — maior, cor condicional por meta */}
      <BlurFade delay={0} inView className="sm:col-span-2">
        <StyledCard
          className="flex h-full flex-col justify-center px-6 py-5"
          withGradient
          corners="left"
        >
          <p className="ds-small text-muted-foreground/80 mb-2 text-xs font-semibold tracking-wider uppercase">
            Taxa de Retenção
          </p>
          {!temDadoTx ? (
            <p className={`ds-display text-5xl font-bold ${txClassName}`}>—</p>
          ) : (
            <p className={`ds-display flex items-baseline text-5xl font-bold ${txClassName}`}>
              <NumberTicker
                value={tx! * 100}
                decimalPlaces={1}
                delay={0.1}
                className={txClassName}
              />
              <span>%</span>
            </p>
          )}
        </StyledCard>
      </BlurFade>

      {/* Stats secundários: Pedidos / Retidos / Churn — menores, visual neutro */}
      <div className="grid grid-cols-3 gap-4 sm:col-span-3">
        {secundarios.map((item, idx) => (
          <BlurFade key={item.id} delay={0.06 * (idx + 1)} inView>
            <StyledCard
              className="flex h-full flex-col justify-center px-4 py-2.5"
              withGradient
              corners={idx === secundarios.length - 1 ? "right" : "none"}
            >
              <p className="ds-small text-muted-foreground/80 mb-1 text-xs font-semibold tracking-wider uppercase">
                {item.label}
              </p>
              <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
                <NumberTicker
                  value={item.valor}
                  decimalPlaces={item.decimais}
                  delay={0.06 * (idx + 1) + 0.1}
                  className="text-foreground tracking-tight dark:text-foreground"
                />
              </p>
            </StyledCard>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
