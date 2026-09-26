"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Esconde a barra azul do bprogress (topo da tela, cor fixa #3b82f6 — ver
 * progress-provider.tsx, NÃO alterado) em /kpi/operadores, /kpi/gestor,
 * /kpi/detalhado-polo, /kpi/evolucao, /configuracoes/equipe e
 * /reports/consolidado: essas seis já têm loading.tsx próprio (fundo
 * borrado, tema Zen Linen), a barra genérica ficaria redundante e destoando
 * ali. Nenhuma outra página é afetada — a barra continua normal em todo o
 * resto do site.
 *
 * Duas camadas, pra não deixar a barra "piscar" nem por um frame ao ENTRAR
 * nessas rotas (agora seis, com /reports/consolidado — que também ganhou
 * loading.tsx próprio nesta rodada):
 * 1) Clique num link, capturado ANTES do onClick do Next <Link> que dispara
 *    router.push() → bprogress.start() — se o destino é uma das 2 rotas,
 *    já esconde a barra antes dela sequer nascer.
 * 2) usePathname() reativo — garante que a barra continua escondida
 *    enquanto a rota ATUAL for uma dessas 2 (cobre navegação sem clique em
 *    <a>, ex. voltar/avançar no histórico, router.push() programático) e
 *    volta a mostrar normalmente assim que a navegação sai pra qualquer
 *    outra página — inclusive durante a própria transição de saída, já que
 *    o pathname só troca quando a navegação termina (ver relato na
 *    entrega: "enquanto estou nelas" cobre o trecho de saída também).
 *
 * A classe é só um interruptor no <html>; quem some com a barra é a regra
 * CSS abaixo (via <style>, não em globals.css — escopada só a esta
 * feature).
 */
const ROTAS_SEM_BARRA = [
  "/kpi/operadores",
  "/kpi/gestor",
  "/kpi/detalhado-polo",
  "/kpi/evolucao",
  "/configuracoes/equipe",
  "/reports/consolidado",
];
const HIDE_CLASS = "hide-bprogress-bar";

function ehRotaSemBarra(pathname: string | null): boolean {
  if (!pathname) return false;
  return ROTAS_SEM_BARRA.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

export function HideProgressBarForRoutes() {
  const pathname = usePathname();

  // Camada 2: reage à rota atual (cobre "enquanto estou nelas" e navegação
  // sem clique em <a>).
  useEffect(() => {
    document.documentElement.classList.toggle(HIDE_CLASS, ehRotaSemBarra(pathname));
  }, [pathname]);

  // Camada 1: intercepta o clique antes da navegação começar, pra já
  // esconder a barra antes dela aparecer (o efeito acima só reage DEPOIS
  // que a navegação termina e o pathname muda).
  useEffect(() => {
    function handleClickCapture(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let destino: string;
      try {
        destino = new URL(anchor.href, window.location.href).pathname;
      } catch {
        return;
      }

      if (ehRotaSemBarra(destino)) {
        document.documentElement.classList.add(HIDE_CLASS);
      }
    }

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, []);

  return (
    <style>{`
      html.${HIDE_CLASS} .bprogress {
        display: none !important;
      }
    `}</style>
  );
}
