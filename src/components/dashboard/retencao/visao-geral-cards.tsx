"use client";

import dynamic from "next/dynamic";
import { StaticNumber } from "@/components/ui/static-number";
import type { VisaoGeralData } from "@/lib/retencao/get-visao-geral";

interface VisaoGeralCardsProps {
  data: VisaoGeralData;
  /** Meta de 0 a 100 — usada pra colorir a Taxa de Retenção (verde/vermelho). */
  meta: number;
  /**
   * true: cards sem animação de entrada (sem BlurFade e sem contagem do
   * NumberTicker) — já aparecem prontos ao sair do loading. Usado só por
   * /s/reports/consolidado; /operacao/comparativo-consolidado mantém o
   * padrão (false).
   */
  semAnimacao?: boolean;
}

// Animações de entrada só nas rotas que as usam (semAnimacao = false):
// carregadas sob demanda, fora do bundle de /s/reports/consolidado, que
// renderiza só SemAnimacao/StaticNumber.
const BlurFade = dynamic(() => import("@/components/ui/blur-fade").then((m) => m.BlurFade));
const NumberTicker = dynamic(() =>
  import("@/components/ui/number-ticker").then((m) => m.NumberTicker),
);

/** Wrapper sem animação — mesma className do BlurFade, ignora delay/inView. */
function SemAnimacao({ className, children }: { className?: string; children: React.ReactNode; delay?: number; inView?: boolean }) {
  return <div className={className}>{children}</div>;
}

type StatSecundario = {
  id: string;
  label: string;
  valor: number;
  decimais: number;
};

/**
 * Visual dos cards numéricos alinhado ao padrão de /kpi/gestor
 * (KpiGestorCard, ver kpi-gestor-card.tsx): caixa neutra (bg-card/70 +
 * border + shadow-sm), SEM cantoneiras (StyledCard) — lá as cantoneiras só
 * aparecem no container do gráfico, não nos cards de número. Mesma classe
 * de rótulo (ds-small text-muted-foreground uppercase tracking-wider) e
 * mesma classe do valor grande (ds-display font-semibold).
 *
 * Hierarquia visual assimétrica (1 stat primário em destaque + secundários
 * menores ao redor) preservada da rodada anterior — só a "casca" do card
 * mudou de StyledCard pra caixa neutra.
 *
 * 1 linha só (não 2) de propósito: este card vive dentro do slot de altura
 * fixa do trilho horizontal — aumentar a altura aqui reabriria os ajustes
 * de dimensionamento já calibrados nas etapas anteriores.
 */
export function VisaoGeralCards({ data, meta, semAnimacao = false }: VisaoGeralCardsProps) {
  const Entrada = semAnimacao ? SemAnimacao : BlurFade;
  const Numero = semAnimacao ? StaticNumber : NumberTicker;
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
      <Entrada delay={0} inView className="sm:col-span-2">
        <div className="relative flex h-full flex-col justify-center gap-2 overflow-hidden rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
          {/* data-status-meta: gancho sem efeito visual próprio — só
              /s/reports/consolidado colore a barra por ele (verde/vermelho
              conforme a meta, em reports-consolidado.css); as demais rotas
              seguem com var(--primary). */}
          <div
            aria-hidden="true"
            data-status-meta={!temDadoTx ? "sem-dado" : abaixoDaMeta ? "abaixo" : "dentro"}
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{ background: "var(--primary)" }}
          />
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            Taxa de Retenção
          </p>
          {!temDadoTx ? (
            <p className={`ds-display text-5xl font-semibold ${txClassName}`}>—</p>
          ) : (
            <p className={`ds-display flex items-baseline text-5xl font-semibold ${txClassName}`}>
              <Numero
                value={tx! * 100}
                decimalPlaces={1}
                delay={0.1}
                className={txClassName}
              />
              <span>%</span>
            </p>
          )}
        </div>
      </Entrada>

      {/* Stats secundários: Pedidos / Retidos / Churn — menores, visual neutro */}
      <div className="grid grid-cols-3 gap-4 sm:col-span-3">
        {secundarios.map((item, idx) => (
          <Entrada key={item.id} delay={0.06 * (idx + 1)} inView>
            <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 p-4 shadow-[var(--shadow-sm)] backdrop-blur-md">
              <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
                {item.label}
              </p>
              <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
                <Numero
                  value={item.valor}
                  decimalPlaces={item.decimais}
                  delay={0.06 * (idx + 1) + 0.1}
                  className="text-foreground tracking-tight dark:text-foreground"
                />
              </p>
            </div>
          </Entrada>
        ))}
      </div>
    </div>
  );
}
