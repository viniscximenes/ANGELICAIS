"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Seção visível agora: "topo" (bloco da tabela do topo) ou o índice do card do trilho. */
export type SecaoAtiva = "topo" | number;

/**
 * Descobre a seção visível acompanhando a rolagem:
 * - enquanto o bloco do topo (#idTopo) ocupa boa parte da tela (o fundo
 *   dele ainda abaixo de 35% da altura da janela) → "topo";
 * - depois disso, o card do trilho horizontal cuja borda esquerda está mais
 *   perto da borda esquerda da área do trilho (é o que está "na frente",
 *   já que o trilho desliza pra esquerda conforme a página rola).
 * Lê só posições do DOM (#idTopo, #trilho-card-N) — não mexe no trilho nem
 * nos cálculos de pin/snap dele. rAF evita medir mais de uma vez por frame.
 */
export function useSecaoAtiva(idTopo: string): SecaoAtiva {
  const [ativo, setAtivo] = useState<SecaoAtiva>("topo");

  useEffect(() => {
    let raf = 0;
    function medir() {
      raf = 0;
      const topo = document.getElementById(idTopo);
      if (topo && topo.getBoundingClientRect().bottom > window.innerHeight * 0.35) {
        setAtivo("topo");
        return;
      }
      const primeiro = document.getElementById("trilho-card-0");
      const area = primeiro?.parentElement?.parentElement;
      if (!primeiro || !area) return;
      const esquerdaArea = area.getBoundingClientRect().left;
      let melhor = 0;
      let menorDistancia = Infinity;
      for (let i = 0; ; i++) {
        const card = document.getElementById(`trilho-card-${i}`);
        if (!card) break;
        const distancia = Math.abs(card.getBoundingClientRect().left - esquerdaArea);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          melhor = i;
        }
      }
      setAtivo(melhor);
    }
    function agendar() {
      if (!raf) raf = requestAnimationFrame(medir);
    }
    agendar();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, [idTopo]);

  return ativo;
}

/**
 * Caixa de largura fixa do ícone (todos os textos começam no mesmo ponto) +
 * marcador do item ativo: tracinho vertical à esquerda, no estilo das
 * cantoneiras dos cards. Cores em globals.css (.nav-secoes [data-nav-ativo]).
 */
export function IconeNav({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  return (
    <span data-nav-icone data-nav-ativo={ativo || undefined} className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <span aria-hidden="true" data-nav-marcador className="absolute top-0.5 -left-2.5 h-4 w-0.5 rounded-full" />
      {children}
    </span>
  );
}
