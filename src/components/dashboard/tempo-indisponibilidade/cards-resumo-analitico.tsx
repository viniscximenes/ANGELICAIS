"use client";

import { StaticNumber } from "@/components/ui/static-number";
import { META_TEMPO_LOGADO_SEGUNDOS } from "@/lib/d1-db/types";

import type { OperadorAnaliticoTempoIndisp } from "./merge-tempo-indisp";

function formatTempoSegundos(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Média simples ignorando operadores sem dado no campo (fora do numerador E do divisor). */
function media<T>(operadores: T[], getValor: (op: T) => number | null): number | null {
  const comDado = operadores.filter((op) => getValor(op) !== null);
  if (comDado.length === 0) return null;
  const soma = comDado.reduce((s, op) => s + (getValor(op) as number), 0);
  return soma / comDado.length;
}

interface CardsResumoAnaliticoProps {
  /**
   * MESMO array (mesma referência) passado pra TempoIndispTabela — garante
   * que a média usa exatamente os mesmos valores por operador que aparecem
   * na tabela, sem recalcular de outra fonte.
   */
  operadores: OperadorAnaliticoTempoIndisp[];
  /** Meta de Indisp.% do gestor (gestor_config_fantasia.meta_indisponibilidade, via engrenagem) — mesma usada por cumpriuMetaIndisp na tabela. */
  metaIndisponibilidade: number;
}

export function CardsResumoAnalitico({
  operadores,
  metaIndisponibilidade,
}: CardsResumoAnaliticoProps) {
  // tempoLogadoSegundos > 0 é o mesmo critério de "sem dado" já usado aqui
  // antes da reformulação (equivalente a statusTL === "ausente").
  const tempoLogadoMedioSegundos = media(
    operadores.filter((op) => op.tempoLogadoSegundos > 0),
    (op) => op.tempoLogadoSegundos,
  );
  const indispMedia = media(operadores, (op) => op.indisponibilidade);
  const nr17Media = media(operadores, (op) => op.nr17Pct);
  const particularMedia = media(operadores, (op) => op.pausaParticularPct);

  // >= 06:20:00 = verde — MESMA comparação de cumpriuMetaTL
  // (get-gestor-tempo-logado.ts: tempoLogadoSegundos >= META_TEMPO_LOGADO_SEGUNDOS).
  const tempoLogadoClass =
    tempoLogadoMedioSegundos === null
      ? "text-foreground"
      : tempoLogadoMedioSegundos >= META_TEMPO_LOGADO_SEGUNDOS
        ? "text-success"
        : "text-danger";

  // < meta = verde — MESMA comparação de cumpriuMeta em
  // get-gestor-indisponibilidade.ts (indisp_percent < metaIndisponibilidade,
  // estrito). Repare: a tabela usa "<" pra cumprir, não "<="; alinhado aqui
  // de propósito (ver relatório da tarefa).
  const indispClass =
    indispMedia === null
      ? "text-foreground"
      : indispMedia < metaIndisponibilidade
        ? "text-success"
        : "text-danger";

  // Cor via TOKEN (var(--success)/var(--danger)), passada como `style`
  // (não só `className`) pro <NumberTicker> — causa real do card aparecer
  // branco no tema escuro: NumberTicker (number-ticker.tsx) tem
  // `text-black dark:text-white` HARDCODED na própria className base,
  // mesclada via cn()/tailwind-merge com o className recebido. `dark:` é
  // outra "variante" pro tailwind-merge (não conflita com uma classe SEM
  // variante como `text-success`), então as duas convivem no HTML; no
  // tema escuro, a regra `.dark\:text-white` do CSS gerado vem DEPOIS de
  // `.text-success` no stylesheet (variantes são emitidas em bloco
  // separado, após as classes-base) e vence no empate de especificidade —
  // por isso só o tema escuro tinha o bug (no claro, `.text-success` já
  // vem depois de `.text-black`, mesma família sem variante, ordem
  // alfabética/de descoberta já favorecia a classe certa). `style` inline
  // tem especificidade maior que QUALQUER classe, então sempre vence —
  // não mexi em number-ticker.tsx (compartilhado com EquipeTable/
  // VisaoGeralCards do consolidado, que tem exatamente o mesmo padrão —
  // NÃO CORRIGIDO ali de propósito, fora do escopo e mudaria o
  // consolidado).
  const indispColorVar =
    indispMedia === null ? undefined : indispMedia < metaIndisponibilidade ? "var(--success)" : "var(--danger)";

  return (
    // Mesmo padrão de VisaoGeralCards (consolidado): caixa neutra
    // (rounded-lg border border-border bg-card/70 shadow-sm backdrop-blur),
    // SEM cantoneiras (StyledCard) — lá as cantoneiras só aparecem no
    // container do gráfico/tabela, não nos cards de número. grid-cols-1
    // empilha em mobile; a partir de sm, uma grade única cujas colunas
    // viram "unidades" — card grande = 2 unidades, pequeno = 1 (mesma
    // proporção 2:1 do card primário/secundários de lá, só generalizada
    // pra 2 grandes em vez de 1: 2+2+1+1 = 6 colunas). sm:items-end —
    // MESMA classe de VisaoGeralCards, cada item ocupa só a própria
    // altura de conteúdo (os pequenos não esticam) e é alinhado pela BASE
    // da linha (altura do maior item, os cards grandes).
    // text-4xl xl:text-5xl nos dois cards grandes (abaixo): VisaoGeralCards
    // não tem NENHUM passo de fonte responsivo (é text-5xl fixo) porque o
    // valor dele (ex. "62.3%") é curto — o nosso "Tempo Logado" é HH:MM:SS
    // (8 caracteres) e mede via Puppeteer, em viewport real, transbordava
    // 36px do card em 1100px de largura com text-5xl fixo. Como não há
    // padrão de clamp pra copiar do consolidado, escalei usando a MESMA
    // escala tipográfica Tailwind já usada em todo o projeto (um passo
    // abaixo, text-4xl, até xl:1280px, onde volta a text-5xl) — não é um
    // número solto, é o próximo degrau padrão da escala.
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:items-end">
      <div className="sm:col-span-2">
        <div className="tempo-indisp-resumo-card relative flex h-full flex-col justify-center gap-2 overflow-hidden rounded-lg border border-border bg-card/70 px-6 py-5 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-[3px]"
            // Mesma cor do número (verde dentro da meta, vermelho abaixo) —
            // igual à barra do card "Taxa de Retenção" do consolidado. Sem
            // dado: mantém var(--primary).
            style={{
              background:
                tempoLogadoMedioSegundos === null
                  ? "var(--primary)"
                  : tempoLogadoMedioSegundos >= META_TEMPO_LOGADO_SEGUNDOS
                    ? "var(--success)"
                    : "var(--danger)",
            }}
          />
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            Tempo Logado
          </p>
          <p className={`ds-display tracking-tight text-4xl xl:text-5xl font-semibold tabular-nums ${tempoLogadoClass}`}>
            {tempoLogadoMedioSegundos === null ? "—" : formatTempoSegundos(tempoLogadoMedioSegundos)}
          </p>
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className="tempo-indisp-resumo-card flex h-full flex-col justify-center gap-2 rounded-lg border border-border bg-card/70 px-6 py-5 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            Indisp. %
          </p>
          {indispMedia === null ? (
            <p className={`ds-display tracking-tight text-4xl xl:text-5xl font-semibold ${indispClass}`}>—</p>
          ) : (
            <p className={`ds-display flex items-baseline tracking-tight text-4xl xl:text-5xl font-semibold ${indispClass}`}>
              <StaticNumber
                value={indispMedia}
                decimalPlaces={1}
                className={indispClass}
                style={indispColorVar ? { color: indispColorVar } : undefined}
              />
              <span>%</span>
            </p>
          )}
        </div>
      </div>

      <div className="sm:col-span-1">
        <div className="tempo-indisp-resumo-card flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 px-4 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            NR17 %
          </p>
          {nr17Media === null ? (
            <p className="ds-display text-foreground text-3xl font-semibold">—</p>
          ) : (
            <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
              <StaticNumber
                value={nr17Media}
                decimalPlaces={1}
                className="text-foreground tracking-tight dark:text-foreground"
              />
              <span>%</span>
            </p>
          )}
        </div>
      </div>

      <div className="sm:col-span-1">
        <div className="tempo-indisp-resumo-card flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card/70 px-4 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md">
          <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">
            Particular %
          </p>
          {particularMedia === null ? (
            <p className="ds-display text-foreground text-3xl font-semibold">—</p>
          ) : (
            <p className="ds-display text-foreground flex items-baseline text-3xl font-semibold">
              <StaticNumber
                value={particularMedia}
                decimalPlaces={1}
                className="text-foreground tracking-tight dark:text-foreground"
              />
              <span>%</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
