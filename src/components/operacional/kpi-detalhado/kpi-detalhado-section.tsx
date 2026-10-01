"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconFilterFilled,
  IconSearch,
  IconSelector,
} from "@tabler/icons-react";

import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import { celulaApresentacao } from "@/app/(dashboard)/s/kpi/operadores/_lib/celula-apresentacao";
import { formatKpiValueLocal } from "@/app/(dashboard)/s/kpi/operadores/_lib/format-kpi-value-local";
import { StyledCard } from "@/components/gestor/styled-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { KpiDetalhadoData } from "@/lib/kpi/detalhado/get-kpi-detalhado";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";

type SortDir = "desc" | "asc";
type SortState = { slug: string; dir: SortDir } | null;

// Peso do título "Detalhado Polo" — mesmo valor/mesmo motivo de
// TITULO_WEIGHT_CLASS em kpi-equipe-section.tsx (Instrument Sans, isolado
// aqui pra poder trocar rápido pra "font-medium" se 600 ficar pesado
// demais). Não importado de lá porque não é exportado (função/consts locais
// daquele arquivo, que não pode mudar).
const TITULO_WEIGHT_CLASS = "font-semibold";

/** Separador "·" do subtítulo — cópia do mesmo componente local usado em
 *  kpi-equipe-section.tsx/kpi-gestor-section.tsx (não exportado de lá). */
function SubtituloSeparador() {
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        marginInline: "0.5rem",
        color: "color-mix(in srgb, var(--muted-foreground) 60%, transparent)",
      }}
    >
      ·
    </span>
  );
}

// Larguras fixas das duas primeiras colunas (sticky) — usadas tanto no
// offset `left` quanto no cálculo de minWidth da tabela.
const COL_OPERADOR_W = 150;
const COL_GESTOR_W = 210;
// "Status" acompanha o scroll horizontal (não é sticky) — só Operador e
// Gestor ficam congelados.
const COL_STATUS_W = 140;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Ciclo de ordenação de uma coluna de KPI, a cada clique no header:
 *   aleatório (null) → decrescente → crescente → aleatório → ...
 * Só uma coluna fica ativa por vez: clicar em outra zera a anterior.
 * (A coluna "Gestor" NÃO usa isto — ela abre um filtro, não ordena.)
 */
function proximoSort(atual: SortState, slug: string): SortState {
  if (!atual || atual.slug !== slug) return { slug, dir: "desc" };
  if (atual.dir === "desc") return { slug, dir: "asc" };
  return null;
}

function SortIcon({ ativo, dir }: { ativo: boolean; dir: SortDir | null }) {
  if (!ativo || dir === null) {
    return (
      <IconSelector
        size={14}
        className="ml-1 inline-block align-middle opacity-40"
        aria-hidden="true"
      />
    );
  }
  return dir === "asc" ? (
    <IconChevronUp
      size={14}
      className="text-primary ml-1 inline-block align-middle"
      aria-hidden="true"
    />
  ) : (
    <IconChevronDown
      size={14}
      className="text-primary ml-1 inline-block align-middle"
      aria-hidden="true"
    />
  );
}

interface KpiDetalhadoSectionProps {
  dados: KpiDetalhadoData;
}

export function KpiDetalhadoSection({ dados }: KpiDetalhadoSectionProps) {
  const { colunas, linhas, dataCorte, gestores } = dados;

  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [gestorFiltro, setGestorFiltro] = useState<string | null>(null);
  const [filtroAberto, setFiltroAberto] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const theadRef = useRef<HTMLTableSectionElement | null>(null);
  // Barra de rolagem horizontal logo abaixo dos títulos das colunas (a
  // nativa do card, embaixo da tabela, fica oculta) — sincronizada com o
  // scrollLeft do card nos dois sentidos.
  const barraRef = useRef<HTMLDivElement | null>(null);
  const [barra, setBarra] = useState({ visivel: 0, total: 0 });
  // "Último clique foi dentro do container da tabela?" — decide se as setas
  // rolam a tabela ou a página.
  const cliqueDentroRef = useRef(false);

  const gestorFiltroNome = gestorFiltro
    ? (gestores.find((g) => g.id === gestorFiltro)?.nome ?? null)
    : null;

  // ── Sempre abrir no topo (cabeçalho) ao recarregar — réplica da correção
  // de /s/reports/consolidado (RetencaoDetalheSection). O navegador restaura
  // a posição de scroll anterior, e tenta de novo a cada vez que a altura
  // do documento cresce o bastante pra alcançá-la; um scrollTo(0,0) único
  // não cobre isso. Complementa o script inline do loading.tsx (que age
  // antes do primeiro paint): restauração nativa desligada + "guarda" por
  // requestAnimationFrame que volta pro topo se o scroll sair de 0 sem
  // gesto do usuário. Desliga no primeiro wheel/toque/tecla ou após
  // UNLOCK_MS — nunca prende uma rolagem manual. useLayoutEffect: a
  // primeira correção roda antes do navegador pintar, sem flash.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const UNLOCK_MS = 2000;
    let active = true;
    let rafId = 0;

    const stop = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      window.clearTimeout(timeoutId);
    };

    const tick = () => {
      if (!active) return;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      rafId = requestAnimationFrame(tick);
    };

    window.scrollTo(0, 0);
    tick();

    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const timeoutId = window.setTimeout(stop, UNLOCK_MS);

    return () => {
      stop();
      window.history.scrollRestoration = previous;
    };
  }, []);

  // ── Setas do teclado: rolam SÓ a tabela quando o foco está nela, SÓ a
  // página quando não está. Nunca as duas. Não interfere em inputs.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const cont = scrollRef.current;
      cliqueDentroRef.current = !!cont && cont.contains(e.target as Node);
    }

    function onKeyDown(e: KeyboardEvent) {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key)) return;

      const ae = document.activeElement as HTMLElement | null;
      const digitando =
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable);
      if (digitando) return; // deixa o cursor de texto se mover nativamente

      const cont = scrollRef.current;
      const horizontal = e.key === "ArrowLeft" || e.key === "ArrowRight";
      // ←/→ rolam a tabela (quando o último clique foi nela); ↑/↓ sempre a
      // página — o card não tem rolagem vertical própria (cresce até a
      // altura da tabela), então mandar ↑/↓ pra ele não fazia nada.
      const alvo: HTMLElement | Window =
        horizontal && cliqueDentroRef.current && cont ? cont : window;

      // A página não rola horizontalmente — ignora ←/→ quando o alvo é a
      // janela, pra não engolir a tecla à toa.
      if (alvo === window && horizontal) return;

      e.preventDefault();
      // Repetições automáticas da tecla segurada são ignoradas: quem rola
      // enquanto ela está apertada é o loop abaixo, em velocidade constante.
      if (e.repeat) return;

      const dir = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
      const eixo = horizontal ? "x" : "y";
      const mesmoMovimento = anim.raf !== 0 && anim.alvo === alvo && anim.eixo === eixo;
      anim.alvo = alvo;
      anim.eixo = eixo;
      anim.dir = dir;
      anim.tecla = e.key;
      anim.segurando = true;
      anim.inicioToque = performance.now();
      anim.destino = limitar(
        (mesmoMovimento ? anim.destino : lerPos()) + dir * (horizontal ? PASSO_H : PASSO_V),
      );
      if (!anim.raf) {
        anim.ultimo = performance.now();
        anim.raf = requestAnimationFrame(quadro);
      }
    }

    // ── Rolagem por teclado com animação própria (requestAnimationFrame).
    // Antes era `scrollBy({ behavior: "smooth" })` a cada keydown: ao
    // SEGURAR a seta, o navegador repete o keydown ~30x/s e cada chamada
    // reiniciava a animação suave do zero — rolagem atrasada e aos trancos.
    // Agora:
    //  - toque: avança um passo (160px ←/→, 120px ↑/↓) com desaceleração
    //    suave (aproximação exponencial do destino);
    //  - segurando: depois de ATRASO_HOLD_MS o destino passa a avançar em
    //    velocidade constante e a posição o acompanha com a mesma suavização;
    //  - ao soltar: desliza até o destino e para.
    const PASSO_H = 160;
    const PASSO_V = 120;
    const VEL_H = 1100; // px/s segurando ←/→
    const VEL_V = 900; // px/s segurando ↑/↓
    const ATRASO_HOLD_MS = 180;
    const SUAVIZACAO = 14; // maior = alcança o destino mais rápido

    const anim = {
      alvo: null as HTMLElement | Window | null,
      eixo: "x" as "x" | "y",
      dir: 1 as 1 | -1,
      tecla: "",
      segurando: false,
      inicioToque: 0,
      destino: 0,
      ultimo: 0,
      raf: 0,
    };

    function lerPos(): number {
      const a = anim.alvo;
      if (!a) return 0;
      if (a === window) return anim.eixo === "y" ? window.scrollY : window.scrollX;
      const el = a as HTMLElement;
      return anim.eixo === "x" ? el.scrollLeft : el.scrollTop;
    }

    function maxPos(): number {
      const a = anim.alvo;
      if (!a) return 0;
      if (a === window) {
        const doc = document.documentElement;
        return anim.eixo === "y"
          ? doc.scrollHeight - window.innerHeight
          : doc.scrollWidth - window.innerWidth;
      }
      const el = a as HTMLElement;
      return anim.eixo === "x"
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight;
    }

    function limitar(v: number): number {
      return Math.min(Math.max(0, v), Math.max(0, maxPos()));
    }

    function escrever(v: number) {
      const a = anim.alvo;
      if (!a) return;
      const opcoes: ScrollToOptions =
        anim.eixo === "x" ? { left: v, behavior: "instant" } : { top: v, behavior: "instant" };
      a.scrollTo(opcoes);
    }

    function quadro(agora: number) {
      const dt = Math.min(agora - anim.ultimo, 50) / 1000;
      anim.ultimo = agora;

      if (anim.segurando && agora - anim.inicioToque >= ATRASO_HOLD_MS) {
        const vel = anim.eixo === "x" ? VEL_H : VEL_V;
        anim.destino = limitar(anim.destino + anim.dir * vel * dt);
      }

      const atual = lerPos();
      const falta = anim.destino - atual;
      if (!anim.segurando && Math.abs(falta) < 1) {
        escrever(anim.destino);
        anim.raf = 0;
        return;
      }
      // Passo mínimo de 1px: o navegador arredonda o scroll e um passo
      // fracionário no fim da desaceleração não sairia do lugar.
      let passo = falta * Math.min(1, dt * SUAVIZACAO);
      if (Math.abs(passo) < 1) passo = Math.sign(falta) * Math.min(1, Math.abs(falta));
      escrever(atual + passo);
      anim.raf = requestAnimationFrame(quadro);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === anim.tecla) anim.segurando = false;
    }

    function onBlur() {
      anim.segurando = false;
    }

    document.addEventListener("mousedown", onDocMouseDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      if (anim.raf) cancelAnimationFrame(anim.raf);
      document.removeEventListener("mousedown", onDocMouseDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ── Barra de rolagem abaixo do cabeçalho: mede a largura visível e total
  // do card e espelha o scrollLeft entre o card e a barra.
  useEffect(() => {
    const cont = scrollRef.current;
    const barraEl = barraRef.current;
    if (!cont || !barraEl) return;

    function medir() {
      if (!cont) return;
      setBarra({ visivel: cont.clientWidth, total: cont.scrollWidth });
    }

    // Só um lado "comanda" por vez: a barra só empurra o card enquanto o
    // ponteiro está sobre ela (arrastar/roda na barra). Sem isso, a rolagem
    // suave das setas do teclado no card era desfeita: o card copiava o
    // valor pra barra, a barra devolvia um valor já atrasado e o card
    // voltava, travando a navegação.
    // Arrastando o polegar, o ponteiro pode sair da barra — continua sendo
    // ela quem comanda até soltar o botão.
    let sobreBarra = false;
    let arrastando = false;
    let ponteiroNaBarra = false;
    const atualizar = () => {
      ponteiroNaBarra = sobreBarra || arrastando;
    };
    const entrarBarra = () => {
      sobreBarra = true;
      atualizar();
    };
    const sairBarra = () => {
      sobreBarra = false;
      atualizar();
    };
    const apertarBarra = () => {
      arrastando = true;
      atualizar();
    };
    const soltar = () => {
      arrastando = false;
      atualizar();
    };

    function onContScroll() {
      if (!cont || !barraEl || ponteiroNaBarra) return;
      if (Math.abs(barraEl.scrollLeft - cont.scrollLeft) >= 1) {
        barraEl.scrollLeft = cont.scrollLeft;
      }
    }

    function onBarraScroll() {
      if (!cont || !barraEl || !ponteiroNaBarra) return;
      if (Math.abs(cont.scrollLeft - barraEl.scrollLeft) >= 1) {
        cont.scrollLeft = barraEl.scrollLeft;
      }
    }

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    if (cont.firstElementChild) ro.observe(cont.firstElementChild);
    cont.addEventListener("scroll", onContScroll, { passive: true });
    barraEl.addEventListener("scroll", onBarraScroll, { passive: true });
    barraEl.addEventListener("pointerenter", entrarBarra);
    barraEl.addEventListener("pointerleave", sairBarra);
    barraEl.addEventListener("pointerdown", apertarBarra);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("mouseup", soltar);
    return () => {
      barraEl.removeEventListener("pointerdown", apertarBarra);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("mouseup", soltar);
      ro.disconnect();
      cont.removeEventListener("scroll", onContScroll);
      barraEl.removeEventListener("scroll", onBarraScroll);
      barraEl.removeEventListener("pointerenter", entrarBarra);
      barraEl.removeEventListener("pointerleave", sairBarra);
    };
  }, []);

  const linhasFiltradas = useMemo(() => {
    const termo = normalizar(busca);
    return linhas.filter((l) => {
      if (gestorFiltro && l.gestorId !== gestorFiltro) return false;
      if (termo && !normalizar(l.nome).includes(termo)) return false;
      return true;
    });
  }, [linhas, busca, gestorFiltro]);

  const linhasOrdenadas = useMemo(() => {
    if (!sort) return linhasFiltradas;
    const idx = colunas.findIndex((c) => c.slug === sort.slug);
    if (idx === -1) return linhasFiltradas;
    return [...linhasFiltradas].sort((a, b) => {
      const va = a.celulas[idx]?.valor ?? null;
      const vb = b.celulas[idx]?.valor ?? null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sort.dir === "desc" ? vb - va : va - vb;
    });
  }, [linhasFiltradas, sort, colunas]);

  // ── Cabeçalho congelado: a rolagem vertical é da PÁGINA, mas o card é
  // overflow-x-auto (contêiner de rolagem), então `sticky top` nos <th> só
  // prenderia dentro do card — nunca na janela. Em vez disso, o <thead> é
  // deslocado (translateY) pra ficar sempre logo abaixo do AppHeader fixo
  // (60px), limitado ao fim da tabela. Sem alterar layout nem a rolagem.
  //
  // Caminho principal: animação CSS ligada à rolagem da página
  // (animation-timeline: scroll(root), em kpi-detalhado-polo.css) — roda no
  // compositor junto com a rolagem, sem o "sobe e desce" de 1 quadro de
  // atraso que um listener de scroll causa. Aqui só se medem, fora da
  // rolagem, o trecho [início, fim] do scroll em que o thead acompanha e o
  // deslocamento máximo, passados como variáveis CSS.
  // Fallback (navegador sem scroll-driven animations): transform via
  // listener de scroll, como antes.
  useEffect(() => {
    const ALTURA_APP_HEADER = 60;
    const suportaTimeline =
      typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    let frame = 0;

    // Topo da tabela no documento via offsetTop (ignora transforms, como a
    // animação de entrada da seção), estável durante a rolagem.
    function topoNoDocumento(el: HTMLElement) {
      let y = 0;
      let atual: HTMLElement | null = el;
      while (atual) {
        y += atual.offsetTop;
        atual = atual.offsetParent as HTMLElement | null;
      }
      return y;
    }

    function medir() {
      frame = 0;
      const thead = theadRef.current;
      const table = thead?.parentElement;
      if (!thead || !table) return;
      const limite = Math.max(0, table.offsetHeight - thead.offsetHeight);

      if (suportaTimeline) {
        const inicio = Math.max(0, topoNoDocumento(table) - ALTURA_APP_HEADER);
        thead.style.setProperty("--kpi-det-inicio", `${inicio}px`);
        thead.style.setProperty("--kpi-det-fim", `${inicio + limite}px`);
        thead.style.setProperty("--kpi-det-limite", `${limite}px`);
        return;
      }

      const topoTabela = table.getBoundingClientRect().top;
      const desloc = Math.min(Math.max(0, ALTURA_APP_HEADER - topoTabela), limite);
      thead.style.transform = desloc > 0 ? `translateY(${desloc}px)` : "";
    }

    function agendar() {
      if (!frame) frame = requestAnimationFrame(medir);
    }

    medir();
    const ro = new ResizeObserver(agendar);
    ro.observe(document.body);
    window.addEventListener("resize", agendar);
    if (!suportaTimeline) window.addEventListener("scroll", agendar, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", agendar);
      window.removeEventListener("scroll", agendar);
    };
  }, [linhasOrdenadas]);

  const minWidth =
    COL_OPERADOR_W + COL_GESTOR_W + COL_STATUS_W + colunas.length * 116;

  return (
    // <section> comum, sem animação de entrada (mesmo padrão de
    // /kpi/operadores): loading.tsx → conteúdo já na tela, troca direta.
    <section className="min-w-0">
      {/*
        Cabeçalho — mesma estrutura de /kpi/operadores e /kpi/gestor
        (kpi-equipe-section.tsx / kpi-gestor-section.tsx): h1 + linha de
        contexto (aqui: gestor filtrado · data de corte, já que esta página
        não tem "gestor logado" — é a visão de todos os polos) + segunda
        linha com o controle que noutras páginas é o MesSelector. Esta
        página não tem toggle de mês, então a busca por nome ocupa a MESMA
        posição (a "linha do seletor de mês + ações" das outras duas). O
        filtro por gestor continua no header da coluna "Gestor" da tabela
        (inalterado). "Painel do Gestor"/"Operação" e a contagem
        "N operadores" saíram — texto herdado que não tinha equivalente nas
        páginas de referência.
      */}
      <div>
        <div className="pt-4">
          <h1
            className={cn(
              "font-sans text-3xl tracking-tight text-foreground md:text-4xl",
              TITULO_WEIGHT_CLASS,
            )}
          >
            Detalhado Polo
          </h1>
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {gestorFiltroNome ?? "Todos os gestores"}
            {dataCorte && (
              <>
                <SubtituloSeparador />
                {`Dados até ${formatDateBR(dataCorte).slice(0, 5)}`}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
          <div className="relative">
            <IconSearch
              size={15}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar operador..."
              aria-label="Buscar operador"
              className="font-sans text-foreground placeholder:text-muted-foreground h-8 w-64 rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] py-1.5 pr-3 pl-9 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
            />
          </div>
        </div>
      </div>

      <div className="pt-2 relative min-w-0">
        {linhas.length === 0 ? (
          <StyledCard withGradient className="p-8 text-center">
            <p className="font-sans text-muted-foreground text-sm">
              Nenhum operador com dados no período.
            </p>
          </StyledCard>
        ) : (
          /*
            Card = KpiFrame (mesmas cantoneiras de /kpi/operadores, "fork
            local de StyledCard" — ver comentário no próprio arquivo, não
            editado). SEM rolagem vertical própria: o card cresce até a
            altura natural da tabela inteira (todas as linhas visíveis), e
            quem rola verticalmente é só a PÁGINA — pedido explícito, ao
            contrário do ajuste anterior (que prendia a altura em 72vh).
            `min-w-0` no container pai acima e aqui: sem isso, o <table> com
            minWidth fixo empurra a largura do próprio flex/grid ancestral
            em vez de ficar contido pelo `overflow-x-auto` (causa do "sair
            da página" resolvida na etapa anterior, continua valendo).

            Rolagem horizontal: só a nativa do container (`scrollbar-tema`,
            `overflow-x-auto`), com o mesmo scroll fluido do navegador. Uma
            barra "flutuante" sincronizada foi tentada numa sessão anterior
            pra facilitar o alcance com a tabela sem limite de altura, mas
            gerava duas barras visíveis ao mesmo tempo e uma rolagem menos
            lisa — removida a pedido, mantendo só a barra nativa do card.
          */
          <KpiFrame className="min-w-0">
            <div
              ref={scrollRef}
              data-kpi-det-scroll
              className="scrollbar-tema overflow-x-auto rounded-[var(--radius)] border border-border"
            >
              <table
                className="w-full border-collapse text-sm"
                style={{ minWidth }}
              >
                <thead ref={theadRef}>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th
                      scope="col"
                      className="font-sans text-muted-foreground sticky top-0 left-0 z-30 bg-[var(--background)] px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
                      style={{ width: COL_OPERADOR_W, minWidth: COL_OPERADOR_W }}
                    >
                      Operador
                    </th>

                    {/* Coluna "Gestor": sem equivalente em /kpi/operadores
                        (lá a equipe já é de um gestor só). O HEADER INTEIRO é
                        a área de clique do filtro (não só o ícone) — mantido,
                        é a função que não pode se perder. Não cicla
                        ordenação, mesmo padrão de antes. */}
                    <th
                      scope="col"
                      className="font-sans text-muted-foreground sticky top-0 z-30 bg-[var(--background)] p-0 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
                      style={{
                        left: COL_OPERADOR_W,
                        width: COL_GESTOR_W,
                        minWidth: COL_GESTOR_W,
                      }}
                    >
                      <Popover open={filtroAberto} onOpenChange={setFiltroAberto}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title="Filtrar por gestor"
                            className={cn(
                              "hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1.5 px-3 py-2.5 uppercase transition-colors",
                              gestorFiltro && "text-primary",
                            )}
                          >
                            <span>Gestor</span>
                            {gestorFiltro ? (
                              <IconFilterFilled
                                size={13}
                                className="text-primary shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <IconFilter
                                size={13}
                                className="shrink-0 opacity-60"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-64 p-1.5"
                          data-page="kpi-detalhado-polo"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setGestorFiltro(null);
                              setFiltroAberto(false);
                            }}
                            className={cn(
                              "hover:bg-muted/60 flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm normal-case transition-colors",
                              !gestorFiltro && "text-primary font-medium",
                            )}
                          >
                            Todos os gestores
                          </button>
                          <div className="bg-border/60 my-1 h-px" />
                          <div className="scrollbar-tema max-h-64 overflow-y-auto">
                            {gestores.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  setGestorFiltro(g.id);
                                  setFiltroAberto(false);
                                }}
                                className={cn(
                                  "hover:bg-muted/60 flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm normal-case transition-colors",
                                  gestorFiltro === g.id &&
                                    "text-primary font-medium",
                                )}
                              >
                                {g.nome}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>

                    {/* Status: sem equivalente em /kpi/operadores. Só
                        exibição, não entra no ciclo de ordenação. */}
                    <th
                      scope="col"
                      className="font-sans text-muted-foreground bg-[var(--background)] px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
                      style={{ width: COL_STATUS_W, minWidth: COL_STATUS_W }}
                    >
                      Status
                    </th>

                    {colunas.map((c) => {
                      const ativo = sort?.slug === c.slug;
                      return (
                        <th
                          key={c.slug}
                          scope="col"
                          aria-sort={
                            ativo ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"
                          }
                          tabIndex={0}
                          onClick={() =>
                            setSort((prev) => proximoSort(prev, c.slug))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSort((prev) => proximoSort(prev, c.slug));
                            }
                          }}
                          title="Clique para ordenar (aleatório → ↓ → ↑)"
                          className={cn(
                            "font-sans px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none",
                            "hover:text-foreground cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                            ativo ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.label}
                          <SortIcon ativo={ativo} dir={sort?.dir ?? null} />
                        </th>
                      );
                    })}
                  </tr>
                  {/* Barra de rolagem horizontal logo abaixo dos títulos —
                      acompanha o cabeçalho congelado. `sticky left-0` com a
                      largura visível do card: fica sempre no campo de visão,
                      mesmo com a tabela rolada pro lado. */}
                  <tr data-kpi-det-barra aria-hidden="true">
                    <th colSpan={colunas.length + 3}>
                      <div
                        ref={barraRef}
                        className="scrollbar-tema sticky left-0 overflow-x-auto overflow-y-hidden"
                        style={{ width: barra.visivel || undefined }}
                      >
                        <div style={{ width: barra.total, height: 1 }} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhasOrdenadas.map((linha, i) => (
                    <tr
                      key={linha.email}
                      className="group hover:bg-accent transition-colors duration-150 motion-reduce:transition-none"
                      style={{
                        borderBottom:
                          i < linhasOrdenadas.length - 1
                            ? "1px solid color-mix(in srgb, var(--border) 60%, transparent)"
                            : undefined,
                      }}
                    >
                      <td
                        className="font-sans text-foreground sticky left-0 z-10 bg-[var(--background)] group-hover:bg-accent transition-colors duration-150 motion-reduce:transition-none px-3 py-2 text-center font-medium whitespace-nowrap"
                        style={{ width: COL_OPERADOR_W, minWidth: COL_OPERADOR_W }}
                      >
                        {linha.nome}
                      </td>
                      <td
                        className="font-sans text-muted-foreground sticky z-10 bg-[var(--background)] group-hover:bg-accent transition-colors duration-150 motion-reduce:transition-none px-3 py-2 text-center whitespace-nowrap"
                        style={{
                          left: COL_OPERADOR_W,
                          width: COL_GESTOR_W,
                          minWidth: COL_GESTOR_W,
                        }}
                      >
                        {linha.gestorNome}
                      </td>
                      <td
                        className="font-sans text-muted-foreground px-3 py-2 text-center whitespace-nowrap"
                        style={{ width: COL_STATUS_W, minWidth: COL_STATUS_W }}
                      >
                        {linha.statusLabel}
                      </td>
                      {linha.celulas.map((cel) => {
                        const { style, srOnlyLabel } = celulaApresentacao(
                          cel.status,
                          cel.valor === null,
                          false,
                        );
                        return (
                          <td
                            key={cel.slug}
                            className="font-sans px-3 py-2 text-center whitespace-nowrap"
                            style={{ ...style, fontVariantNumeric: "tabular-nums" }}
                          >
                            {cel.valor === null ? (
                              cel.valorTexto ? (
                                <span>{cel.valorTexto}</span>
                              ) : (
                                <span className="text-muted-foreground">N/D</span>
                              )
                            ) : (
                              <>
                                {formatKpiValueLocal(cel.valor, cel.valueType)}
                                {srOnlyLabel && <span className="sr-only"> ({srOnlyLabel})</span>}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {linhasOrdenadas.length === 0 && (
                    <tr>
                      <td
                        colSpan={colunas.length + 3}
                        className="font-sans text-muted-foreground px-4 py-8 text-center text-sm"
                      >
                        Nenhum operador corresponde aos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </KpiFrame>
        )}
      </div>
    </section>
  );
}
