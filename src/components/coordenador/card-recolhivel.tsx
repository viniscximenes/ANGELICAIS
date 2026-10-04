"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const DURACAO_MS = 260;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Card que recolhe ao clicar no título (pedido do /c/reports/consolidado).
 *
 * Os cards da página têm o título DENTRO do próprio componente (TituloBloco,
 * TabelaTemas, MatrizTaxaSupervisor...), então este wrapper acha o 1º h2/h3,
 * transforma em botão e, ao clicar, esconde tudo que vem DEPOIS do bloco do
 * título (título + texto de apoio continuam visíveis). "Bloco do título" =
 * o ancestral do heading que ainda tem irmãos depois dele dentro do card.
 *
 * Animação: o conteúdo some (fade) e a altura do card encolhe/expande até a
 * medida final — tudo via Web Animations, sem alterar o layout dos filhos.
 */
export function CardRecolhivel({
  children,
  className,
  chave,
  recolhidoInicial = false,
  onAlternar,
}: {
  children: ReactNode;
  className?: string;
  /** Identificador do card pra salvar o estado (por usuário). */
  chave?: string;
  /** Começa recolhido (estado salvo) — aplicado antes do paint, sem animação. */
  recolhidoInicial?: boolean;
  /** Avisa a cada recolher/expandir (o pai salva). */
  onAlternar?: (chave: string, recolhido: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onAlternarRef = useRef(onAlternar);
  onAlternarRef.current = onAlternar;

  // Layout effect: o estado salvo (recolhido) é aplicado antes do 1º paint,
  // sem o card aparecer aberto e fechar em seguida.
  useLayoutEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const titulo = raiz.querySelector<HTMLElement>("h2, h3");
    if (!titulo) return;

    // Bloco do título = título + texto de apoio: se o pai do heading só tem
    // heading/parágrafos (ex.: <header><h3/><p/></header>), o bloco é o pai.
    // Depois sobe até o ancestral que tem irmãos depois dele.
    let bloco: HTMLElement = titulo;
    const pai = titulo.parentElement;
    if (pai && pai !== raiz && Array.from(pai.children).every((c) => /^(H[1-6]|P)$/.test(c.tagName))) {
      bloco = pai;
    }
    while (bloco.parentElement && bloco.parentElement !== raiz && !bloco.nextElementSibling) {
      bloco = bloco.parentElement;
    }
    // Tudo que vem depois do bloco do título, em todos os níveis até a raiz.
    const conteudo = (): HTMLElement[] => {
      const lista: HTMLElement[] = [];
      let atual: HTMLElement | null = bloco;
      while (atual && atual !== raiz) {
        let irmao = atual.nextElementSibling as HTMLElement | null;
        while (irmao) {
          lista.push(irmao);
          irmao = irmao.nextElementSibling as HTMLElement | null;
        }
        atual = atual.parentElement;
      }
      return lista;
    };

    // Ancestrais entre o bloco do título e a raiz: se algum tem altura fixa
    // (ex.: card do gráfico, lg:h-[calc(100vh-12rem)]), ela é liberada
    // enquanto o card está recolhido — senão o conteúdo some mas o card não
    // encolhe. Guarda o inline original pra restaurar ao expandir.
    const ancestrais: HTMLElement[] = [];
    for (let el = bloco.parentElement; el && el !== raiz; el = el.parentElement) ancestrais.push(el);
    const alturaOriginal = new Map<HTMLElement, string>();
    const liberarAltura = () =>
      ancestrais.forEach((el) => {
        alturaOriginal.set(el, el.style.height);
        el.style.height = "auto";
      });
    const restaurarAltura = () => ancestrais.forEach((el) => (el.style.height = alturaOriginal.get(el) ?? ""));

    let recolhido = false;
    let animando = false;
    titulo.setAttribute("data-recolhivel-titulo", "");
    // Gancho do CSS: recolhido, o bloco do título perde o respiro de baixo
    // (ex.: TituloBloco tem pb-4) — todos os títulos ficam com o mesmo espaço.
    bloco.setAttribute("data-recolhivel-bloco", "");
    titulo.setAttribute("role", "button");
    titulo.setAttribute("tabindex", "0");
    titulo.setAttribute("aria-expanded", "true");
    titulo.title = "Clique para recolher";

    const alternar = () => {
      if (animando) return;
      animando = true;
      const alvos = conteudo();
      const alturaAntes = raiz.offsetHeight;
      // Corta o conteúdo só DURANTE a animação de altura (fora dela, nada de
      // overflow no card — não recorta sombras, hover nem destaques).
      const fim = () => {
        raiz.style.overflow = "";
        animando = false;
      };

      if (!recolhido) {
        // Some: fade do conteúdo, depois esconde e encolhe a altura.
        const fades = alvos.map((el) =>
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURACAO_MS * 0.6, easing: "ease-out", fill: "forwards" }),
        );
        Promise.all(fades.map((a) => a.finished)).then(() => {
          alvos.forEach((el) => {
            el.dataset.recolhivelOculto = "";
            el.style.display = "none";
          });
          liberarAltura();
          fades.forEach((a) => a.cancel());
          const alturaDepois = raiz.offsetHeight;
          raiz.style.overflow = "clip";
          raiz
            .animate([{ height: `${alturaAntes}px` }, { height: `${alturaDepois}px` }], {
              duration: DURACAO_MS,
              easing: EASE,
            })
            .finished.finally(fim);
        });
      } else {
        // Volta: mostra, expande a altura e faz fade-in do conteúdo.
        alvos.forEach((el) => {
          el.style.display = "";
          delete el.dataset.recolhivelOculto;
        });
        restaurarAltura();
        const alturaDepois = raiz.offsetHeight;
        raiz.style.overflow = "clip";
        alvos.forEach((el) =>
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DURACAO_MS, easing: "ease-out" }),
        );
        raiz
          .animate([{ height: `${alturaAntes}px` }, { height: `${alturaDepois}px` }], {
            duration: DURACAO_MS,
            easing: EASE,
          })
          .finished.finally(fim);
      }

      recolhido = !recolhido;
      if (chave) onAlternarRef.current?.(chave, recolhido);
      titulo.setAttribute("aria-expanded", String(!recolhido));
      titulo.title = recolhido ? "Clique para expandir" : "Clique para recolher";
      raiz.toggleAttribute("data-recolhido", recolhido);
    };

    // Estado salvo: já começa recolhido, direto (sem animação).
    if (recolhidoInicial) {
      conteudo().forEach((el) => {
        el.dataset.recolhivelOculto = "";
        el.style.display = "none";
      });
      liberarAltura();
      recolhido = true;
      titulo.setAttribute("aria-expanded", "false");
      titulo.title = "Clique para expandir";
      raiz.setAttribute("data-recolhido", "");
    }
    // A partir daqui o estado é controlado pelo JS — sai a marca do SSR.
    raiz.removeAttribute("data-ssr-recolhido");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        alternar();
      }
    };
    titulo.addEventListener("click", alternar);
    titulo.addEventListener("keydown", onKey);
    return () => {
      titulo.removeEventListener("click", alternar);
      titulo.removeEventListener("keydown", onKey);
    };
    // Estado inicial só no mount (depois o próprio card controla).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data-ssr-recolhido: o HTML do servidor já vem recolhido (CSS esconde o
  // conteúdo antes do JS — sem abrir e fechar no Ctrl+Shift+R). O layout
  // effect aplica o estado real e remove a marca.
  return (
    <div ref={ref} className={className} data-ssr-recolhido={recolhidoInicial ? "" : undefined}>
      {children}
    </div>
  );
}
