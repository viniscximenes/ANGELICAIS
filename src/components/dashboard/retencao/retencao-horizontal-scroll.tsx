"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLenisInstance } from "@/lib/lenis/lenis-instance";
import { onScrollToCardRequest } from "@/lib/retencao/scroll-to-card-event";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

// useLayoutEffect não roda no servidor (gera warning no SSR) — como este
// componente só mede e cria o ScrollTrigger no client, cai pra useEffect
// comum durante SSR e usa useLayoutEffect de fato só no browser. É
// importante ser layout effect (roda ANTES do paint, depois do commit do
// DOM) porque medir scrollWidth/clientWidth dentro de um useEffect comum
// corre o risco de o navegador já ter pintado um frame com o layout ainda
// não 100% assentado (fontes, imagens) antes da nossa leitura.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Breakpoint a partir do qual o scroll-jacking horizontal é ativado. Abaixo
 * disso os slides ficam empilhados verticalmente (ver classes `lg:` no JSX).
 *
 * TODO(mobile): só desliga o pin/scrub por CSS + matchMedia. Ainda falta
 * validar em dispositivo touch real (iOS Safari principalmente) se algum
 * resquício do ScrollTrigger interfere no momentum scroll do Lenis quando a
 * tela é redimensionada cruzando esse breakpoint (ex: rotação de tablet).
 */
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * Multiplicador manual da distância de pin (quanto o usuário precisa rolar
 * verticalmente pra percorrer o trilho horizontal inteiro).
 *
 * 1 = distância "crua" calculada (trackEl.scrollWidth - trackEl.clientWidth).
 * 0.5 = metade da distância. 1.5 = 50% a mais. Ajustar aqui e salvar — não
 * precisa mexer em mais nada do componente pra recalibrar a sensação de
 * scroll.
 */
const PIN_DISTANCE_MULTIPLIER = 0.5;

/**
 * Altura do header fixo do app (`src/components/dashboard/app-header.tsx`:
 * `sticky top-0 z-30 h-[60px]`). O ScrollTrigger, por padrão, pina a seção
 * com `start: "top top"` — engata quando o topo dela chega em y=0. Como o
 * header fica por cima (z-30, sem z-index definido no trilho) exatamente
 * nessa faixa, o topo dos cards ficava coberto/cortado por ele. Engatando o
 * pin em `top ${HEADER_HEIGHT_PX}px` em vez de `top top`, a seção para
 * exatamente abaixo do header, sem sobreposição.
 */
const HEADER_HEIGHT_PX = 60;

interface RetencaoHorizontalScrollProps {
  slides: ReactNode[];
  /**
   * Muda quando o conteúdo real dos slides troca de tamanho de forma
   * relevante (ex.: gráfico Recharts que só mede sua altura via
   * ResponsiveContainer depois do primeiro paint). Qualquer mudança nesta
   * prop força um `ScrollTrigger.refresh()`.
   */
  refreshKey?: string | number;
  /**
   * Conteúdo fixo no topo da área PINADA (título "Detalhamento Analítico",
   * gestora, hora do report). Fica dentro de `section` — junto com os
   * cards, permanece visível durante todo o scroll horizontal — em vez de
   * ficar acima dela, onde rolaria pra fora de vista antes do pin engatar.
   */
  header?: ReactNode;
  /**
   * Quando true, a section pinada NÃO usa a altura fixa
   * `lg:h-[min(80vh,700px)]` — cresce pro tamanho natural do `track`
   * (maior slide entre os que estão nela), sem NENHUMA rolagem vertical
   * interna em lugar nenhum. Opt-in, default false: sem passar essa prop,
   * a section continua com a MESMA altura fixa de sempre — o consolidado
   * nunca passa essa prop (git diff vazio nele, comportamento idêntico,
   * provado por medição). O pin-spacer do próprio GSAP ScrollTrigger já é
   * automaticamente dimensionado pra altura REAL do elemento pinado
   * (não pra um valor fixo) — a chave pra isso funcionar sem "sobra" de
   * scroll é chamar `ScrollTrigger.refresh()` toda vez que a altura real
   * mudar (ver ResizeObserver abaixo, que observa `track.clientHeight`
   * quando `dynamicHeight` está ativo).
   */
  dynamicHeight?: boolean;
}

/**
 * Trilho horizontal com scroll-jacking (pin + scrub) via GSAP ScrollTrigger,
 * sincronizado com o Lenis já configurado em LenisProvider (mesmo ticker,
 * lenis.on("scroll", ScrollTrigger.update) — ver esse arquivo).
 *
 * Cada item de `slides` vira um painel de largura igual (100% da largura da
 * seção), lado a lado, com `overflow-x: hidden` no container e `flex-shrink:
 * 0` nos painéis — o scroll vertical da página é convertido em progresso de
 * translateX até o último painel, só então o pin libera.
 */
export function RetencaoHorizontalScroll({
  slides,
  refreshKey,
  header,
  dynamicHeight = false,
}: RetencaoHorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || slides.length === 0) return;

    // Defensivo contra remount do Fast Refresh / StrictMode em dev: mata
    // qualquer ScrollTrigger que porventura já esteja associado a este MESMO
    // elemento antes de criar um novo, pra nunca acabar com dois pins
    // empilhados no mesmo track (o que dobraria a distância/spacer).
    ScrollTrigger.getAll()
      .filter((st) => st.trigger === section)
      .forEach((st) => st.kill());

    const mm = gsap.matchMedia();

    mm.add(DESKTOP_MEDIA_QUERY, () => {
      // Distância horizontal REAL do trilho — única fonte de verdade,
      // usada tanto pro destino do translateX (getRawDistance) quanto pro
      // `end` do ScrollTrigger (getEnd, com PIN_DISTANCE_MULTIPLIER
      // aplicado só pra distância de SCROLL, nunca pro translateX).
      //
      // Antes o destino do gsap.to usava `xPercent: -100 * (n-1)`, uma
      // fração fixa por card que assume largura IGUAL entre todos os
      // slides. Cada slide já é forçado a 100% da largura do trilho via CSS
      // (w-full/shrink-0 no wrapper), então em teoria isso já batia — mas
      // qualquer divergência (ex: overflow interno do card, arredondamento
      // de subpixel) deixava o xPercent e o `end` calculados por fórmulas
      // DIFERENTES, e o trilho podia parar de andar antes do último card
      // ficar 100% visível. Trocado por `x` em pixels, calculado a partir
      // do MESMO scrollWidth/clientWidth usado no `end` — os dois nunca
      // mais podem divergir entre si.
      // getRawDistance mede só os cards REAIS (não existe mais painel
      // invisível no DOM — ver histórico abaixo).
      const getRawDistance = () => Math.max(0, track.scrollWidth - track.clientWidth);
      const getEnd = () => getRawDistance() * PIN_DISTANCE_MULTIPLIER;

      // Fração do scroll disponível que efetivamente MOVE os cards — o
      // restante (1 - REVEAL_FRACTION) é um "colchão": nada se move (o
      // último card já está 100% revelado), só segura mais um pouco antes
      // do pin soltar, evitando que ele seja cortado em scrolls rápidos.
      //
      // HISTÓRICO: chegamos a testar um painel invisível de verdade no fim
      // do trilho (mesma largura dos demais) pra gerar essa folga via
      // scrollWidth real, em vez de uma pausa artificial — mas isso fazia
      // esse painel em branco ficar visivelmente deslizando pra dentro da
      // tela antes do pin soltar (o `x` ia até revelá-lo por completo).
      // Voltamos pra pausa via timeline: sem elemento físico, nada desliza
      // além do último card de verdade.
      const REVEAL_FRACTION = 0.85;

      // Pontos de snap medidos pela posição REAL de cada card (não por
      // fração fixa 1/(n-1), que assume largura igual entre todos — deixou
      // de bater depois que os cards passaram a ter tamanhos diferentes
      // entre si, e o snap ficava "preso no meio" tentando alinhar num
      // ponto que não correspondia a nenhum card de verdade).
      //
      // getBoundingClientRect (não offsetLeft): offsetLeft é relativo ao
      // ancestral POSICIONADO mais próximo, que aqui é `section`
      // (className "relative"), não necessariamente `track` — usar
      // getBoundingClientRect().left dos dois e subtrair garante a
      // distância real entre os elementos, sem depender de qual ancestral
      // está posicionado.
      //
      // Multiplicado por REVEAL_FRACTION: os pontos abaixo (offset/total)
      // são frações de quanto o `x` já andou (0 a 1 ao longo do TRECHO que
      // revela os cards), mas o valor que o GSAP passa pro snapTo é o
      // progresso da timeline INTEIRA (0 a 1, incluindo a pausa no fim) —
      // sem essa reescala, o snap comparava frações em escalas diferentes
      // e voltava a "prender no meio".
      //
      // Função (não array estático): o GSAP chama isso EM TEMPO REAL a
      // cada vez que o usuário solta o scroll, então não precisa de nenhum
      // mecanismo de refresh separado — sempre lê o layout atual.
      const getSnapPoints = (): number[] => {
        const totalScroll = getRawDistance();
        if (totalScroll <= 0) return [0];
        const trackLeft = track.getBoundingClientRect().left;
        const cards = Array.from(track.children) as HTMLElement[];
        return cards.map((card) => {
          const offset = card.getBoundingClientRect().left - trackLeft;
          return Math.min(Math.max((offset / totalScroll) * REVEAL_FRACTION, 0), 1);
        });
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: true,
          // scrub: true (sem número) = zero atraso — a animação acompanha o
          // scroll 1:1, frame a frame. Qualquer valor numérico (mesmo baixo,
          // como 0.3s) introduz inércia/atraso; com PIN_DISTANCE_MULTIPLIER
          // < 1 (distância física de scroll encurtada), esse atraso passa a
          // representar uma fatia grande do percurso total, e o scroll
          // físico pode chegar no `end` (pin solta) ANTES da animação
          // atrasada terminar de trazer o último card por completo —
          // cortando ele. scrub:true elimina essa corrida por completo.
          scrub: true,
          invalidateOnRefresh: true,
          start: `top ${HEADER_HEIGHT_PX}px`,
          end: () => "+=" + getEnd(),
          // Prende o progresso no ponto REAL mais próximo (getSnapPoints,
          // acima, já reescalado por REVEAL_FRACTION) — nunca numa fração
          // "teórica" que não corresponde a nenhum card de verdade, mesmo
          // com larguras diferentes entre os cards.
          snap: {
            snapTo: (value: number) => {
              const points = getSnapPoints();
              return points.reduce(
                (closest, p) => (Math.abs(p - value) < Math.abs(closest - value) ? p : closest),
                points[0],
              );
            },
            duration: { min: 0.2, max: 0.5 },
            ease: "power1.inOut",
          },
        },
      });

      // Revela os cards nos primeiros REVEAL_FRACTION do scroll disponível
      // (x calculado a partir dos cards reais)...
      tl.to(track, { x: () => -getRawDistance(), ease: "none", duration: REVEAL_FRACTION })
        // ...e "segura" (no-op, nada se move) pelo restante — colchão de
        // scroll depois do último card já 100% visível, antes do pin
        // soltar. Sem elemento físico deslizando (ver comentário acima).
        .to({}, { duration: 1 - REVEAL_FRACTION });

      // Refresh de segurança: garante que o `end` seja recalculado depois
      // que o layout de fato estabilizar (fontes carregando, Recharts
      // medindo o ResponsiveContainer, etc.).
      const refresh = () => ScrollTrigger.refresh();
      requestAnimationFrame(refresh);
      window.addEventListener("load", refresh);
      document.fonts?.ready?.then(refresh).catch(() => {});

      // ResizeObserver chamando refresh() direto no mesmo tick pode entrar
      // em loop: refresh() recalcula o pin, que pode alterar a própria
      // largura observada, disparando o observer de novo — o navegador
      // detecta isso e lança "ResizeObserver loop limit exceeded", que o
      // overlay de dev do Next trata como erro fatal (forçando reload).
      // Corrigido com dois guards: (1) só refresca se a largura realmente
      // mudou, (2) roda no próximo frame (rAF), fora do ciclo síncrono do
      // próprio observer.
      let lastWidth = track.clientWidth;
      let rafId = 0;
      const resizeObserver = new ResizeObserver(() => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const width = track.clientWidth;
          if (width === lastWidth) return;
          lastWidth = width;
          refresh();
        });
      });
      resizeObserver.observe(track);

      // dynamicHeight: gerencia a altura do track por JS (ver comentário
      // na className do track, acima) em vez de deixar pro auto-size do
      // flexbox, que só funciona na primeira resolução de layout. Observa
      // o CONTEÚDO real de cada slide (o filho direto de cada
      // `#trilho-card-N`, que não tem overflow-hidden nem altura fixa
      // própria — só o WRAPPER do slide tem) via ResizeObserver: esse
      // elemento reporta o `scrollHeight` real (não clipado) mesmo com o
      // pai cortando visualmente. Sempre que qualquer um muda de altura
      // (dados carregados, polling de 30s trocando linhas de uma tabela,
      // resize, troca de tema/fonte alterando line-height), reaplica o
      // MAIOR valor como `track.style.height` e chama refresh() — o
      // mesmo guard de rAF evita o loop do ResizeObserver.
      let heightResizeObserver: ResizeObserver | undefined;
      if (dynamicHeight) {
        const contentEls = Array.from(track.children)
          .map((wrapper) => wrapper.firstElementChild)
          .filter((el): el is HTMLElement => el instanceof HTMLElement);

        let lastAppliedHeight = -1;
        let heightRafId = 0;
        const recomputeHeight = () => {
          const natural = contentEls.reduce((max, el) => Math.max(max, el.scrollHeight), 0);
          if (natural === lastAppliedHeight) return;
          lastAppliedHeight = natural;
          track.style.height = `${natural}px`;
          refresh();
        };
        recomputeHeight();

        heightResizeObserver = new ResizeObserver(() => {
          if (heightRafId) cancelAnimationFrame(heightRafId);
          heightRafId = requestAnimationFrame(recomputeHeight);
        });
        contentEls.forEach((el) => heightResizeObserver!.observe(el));
      }

      // Navegação externa (ex: sidebar de /reports/consolidado) pra um card
      // específico do trilho — ADITIVO, não mexe em nenhuma fórmula de
      // end/snap/multiplier já calibrada, só REAPROVEITA o que já existe:
      // o mesmo getSnapPoints() usado pelo snap do ScrollTrigger, e o
      // start/end reais do próprio `tl.scrollTrigger` (que já incorporam
      // PIN_DISTANCE_MULTIPLIER e o offset do header).
      const unsubscribeScrollToCard = onScrollToCardRequest((cardIndex) => {
        const trigger = tl.scrollTrigger;
        if (!trigger) return;
        const points = getSnapPoints();
        const progress = points[cardIndex] ?? points[points.length - 1] ?? 0;
        const targetY = trigger.start + progress * (trigger.end - trigger.start);
        const lenis = getLenisInstance();
        if (lenis) {
          lenis.scrollTo(targetY, { duration: 1 });
        } else {
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      });

      // Cleanup do próprio matchMedia scope: mata o tween e o ScrollTrigger
      // associado quando a media query deixa de bater (ex: resize pra
      // mobile) ou quando o componente desmonta.
      return () => {
        window.removeEventListener("load", refresh);
        if (rafId) cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        heightResizeObserver?.disconnect();
        if (dynamicHeight) track.style.height = "";
        unsubscribeScrollToCard();
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    return () => {
      mm.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, refreshKey]);

  return (
    <div
      ref={sectionRef}
      className={cn(
        "relative lg:flex lg:flex-col lg:overflow-hidden",
        dynamicHeight ? "" : "lg:h-[min(80vh,700px)]",
      )}
    >
      {/*
        Cabeçalho fixo DENTRO da área pinada: `shrink-0` pra não disputar
        altura com o trilho, sempre visível enquanto os cards deslizam.
      */}
      {header && <div className="lg:shrink-0">{header}</div>}

      <div
        ref={trackRef}
        className={cn(
          "flex flex-col gap-6 lg:flex-row lg:flex-nowrap lg:items-start lg:gap-0",
          // dynamicHeight: SEM `lg:flex-1 lg:min-h-0` — com esse par de
          // classes, a altura do track é decidida pela distribuição de
          // espaço livre do flexbox (flex-basis:0% + flex-grow:1), que só
          // "vê" o conteúdo natural dos slides na primeira vez que o
          // browser resolve o layout (quando a altura do container ainda é
          // indefinida). Depois de montado, se o conteúdo de um slide
          // crescer (polling, dados chegando depois), os slides-wrapper
          // (`lg:h-full lg:overflow-hidden`, abaixo) já têm uma altura
          // DEFINIDA herdada do track — o browser não volta a recalcular o
          // "auto" do flex a partir do conteúdo depois disso, então o
          // crescimento fica invisível e o conteúdo novo é cortado pelo
          // overflow-hidden, SEM barra (silenciosamente) — bug real,
          // confirmado via medição (scrollHeight do slide cresceu, mas
          // clientHeight do track não). Corrigido gerenciando a altura do
          // track via JS (useIsomorphicLayoutEffect abaixo, só quando
          // dynamicHeight): mede o scrollHeight real (não clipado) do
          // conteúdo de CADA slide sempre que ele muda, aplica o maior
          // valor como `track.style.height` explícito, e chama
          // ScrollTrigger.refresh(). Sem flex-1/min-h-0 competindo com essa
          // altura explícita.
          dynamicHeight ? "" : "lg:min-h-0 lg:flex-1",
        )}
      >
        {/*
          Altura FIXA vem só de `section`+`track` (acima). `items-start`
          explícito (em vez do `stretch` padrão do flexbox) garante que cada
          slide comece alinhado pelo TOPO do trilho — sem isso, qualquer
          diferença de altura entre slides (mesmo com h-full em todos) podia
          deixar margem pra um vizinho cortar o próprio topo em navegadores
          que resolvem o stretch de forma inconsistente com filhos que têm
          layout flex/grid interno próprio (StyledCard/Card usam
          `display:flex` internamente).

          Cada slide aqui é `overflow-hidden` (não `overflow-y-auto`) — é só
          um clipe de segurança: quem realmente rola verticalmente é o
          conteúdo interno dos cards que têm lista/tabela sem limite
          (OperadoresLista, TabelaTemas, DistribuicaoQuartis, via prop
          `scrollInterno`), não o slide inteiro. Isso mantém título/
          cabeçalho do card fixo e só a lista/tabela rolando, em vez de
          rolar o card inteiro (título incluso).
        */}
        {slides.map((slide, index) => (
          <div
            key={index}
            id={`trilho-card-${index}`}
            className="lg:h-full lg:w-full lg:shrink-0 lg:overflow-hidden lg:px-2"
          >
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
}
