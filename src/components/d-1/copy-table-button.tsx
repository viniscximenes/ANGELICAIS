"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import type { OperadorConsolidado, ResumoEquipe } from "@/lib/d1-db/types";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";
import { copyFormattedHtml, escapeHtml } from "@/lib/utils/copy-formatted-html";
import { cn } from "@/lib/utils";

function getHoraReport(equipe: ResumoEquipe): string {
  if (!equipe.horaReport || equipe.horaReport === "—") return "—";
  // Se a hora contiver segundos (ex: 15:30:00), corta e deixa apenas HH:MM
  const match = equipe.horaReport.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : equipe.horaReport;
}

function formatReportTexto(hora: string): string {
  return `report às ${escapeHtml(hora)}`;
}

function formatReportHtml(
  hora: string,
  pngDataUrl: string,
): string {
  // Blocos empilhados verticalmente, nesta ordem: título → report → imagem.
  // O Teams Web strippa font-size de <div>/<span>, mas RESPEITA font-size em
  // <h2> — por isso o título grande precisa ser <h2> (e o negrito via <b>, que
  // o Teams nunca remove). O report é um <div> (bloco) com <i> dentro: o div
  // garante a quebra de linha e o <i> o itálico. A <img> fica em bloco com
  // display:block (+ <br> de reforço) para não fluir ao lado do texto.
  // Cor do texto FIXA (#1E1E1E, não var(--foreground)/herdada): este HTML é
  // colado fora do site (Teams/Slack/email), sempre em fundo claro — sem
  // cor própria, os dois textos (título "D-1 CONSOLIDADO" e a linha "report
  // às HH:MM") herdavam a cor do documento de ORIGEM (o container invisível
  // de copyFormattedHtml é anexado ao <body> real da página, que reflete o
  // tema GLOBAL do dashboard, tipicamente escuro → texto branco), saindo
  // ilegíveis sobre o fundo branco do destino, mesmo com o tema de
  // /s/reports/consolidado no claro. Cor fixa = sempre legível, os dois
  // "títulos" (acima e abaixo), independente do tema ativo no momento da
  // cópia.
  // Cor repetida no <b>/<i> internos (não só no <h2>/<div> pai): alguns
  // destinos de colar (ex.: Slack, Gmail) só respeitam a cor aplicada no
  // elemento que carrega o texto de fato, ignorando a do ancestral — mesmo
  // sendo herdável em CSS puro, o sanitizador de colagem desses apps às
  // vezes reseta a cor herdada e só preserva a que está no MESMO nó do texto.
  const TITULO_COR = "color: #1E1E1E;";
  const parts: string[] = [
    `<h2 style="font-size: 16px; margin: 0; ${TITULO_COR}"><b style="${TITULO_COR}">D-1 CONSOLIDADO</b></h2>`,
    `<div style="margin-top: 4px; ${TITULO_COR}"><i style="${TITULO_COR}">${formatReportTexto(hora)}</i></div>`,
    `<br>`,
    `<div style="margin-top: 8px;"><img src="${pngDataUrl}" style="display: block; max-width: 1000px; width: 100%;" alt="Tabela consolidado"></div>`,
  ];
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1E1E1E;">${parts.join("")}</div>`;
}

interface CopyTableButtonProps {
  // operadores e supervisor continuam aceitos (o caller os passa), mas o texto
  // copiado não os usa mais — agora é só título + hora do report + imagem.
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
  supervisor?: string;
  /** Nome do supervisor que fez o último report (BASE - 1!S2, junto com a hora). */
  nomeSupervisorReport?: string | null;
  /**
   * Chamado quando a captura termina (sucesso ou erro). Opcional — usado por
   * GestorEquipeSection pra desmontar a tabela oculta do PNG depois do uso.
   */
  onCapturaFim?: () => void;
}

export function CopyTableButton({ equipe, onCapturaFim }: CopyTableButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-tabela-png]");

    if (!target) {
      toast.error("Tabela não encontrada", { className: "reports-consolidado-toast" });
      return;
    }

    setState("copying");

    // SEM tratamento especial por tema aqui de propósito (pedido explícito):
    // tentativas anteriores de forçar cor só pro tema claro (via CSS e via
    // JS na captura) não resolviam de forma confiável e só complicavam o
    // fluxo. A captura agora é IDÊNTICA nos dois temas — reflete
    // exatamente o que está na tela (via capturarComoPng/corDeFundoDoAlvo,
    // que já lê --background/--foreground reais do tema ativo), igual
    // sempre funcionou pro tema escuro. Se o resultado no claro sair com um
    // contraste diferente do que se imaginava, é porque é fiel à tela real
    // — ajustar o visual, se necessário, é responsabilidade do CSS da
    // página (reports-consolidado.css), não de um caso especial aqui.
    try {
      // corDeFundoDoAlvo: true — mesma correção aditiva da 16ª rodada
      // (modal de detalhe do operador). Sem isso, a margem de ~28px ao
      // redor da tabela sai com o --background do tema GLOBAL (globals.css,
      // cinza-claro frio) em vez do bege Zen Linen escopado a
      // [data-page="reports-consolidado"], porque o alvo (`[data-tabela-png]`)
      // fica dentro de um wrapper `position: fixed` que a lib clona
      // isoladamente — resolverTokenCss sem essa opção lê o token a partir
      // da raiz do documento, não do próprio elemento capturado.
      const pngDataUrl = await capturarComoPng(target, { corDeFundoDoAlvo: true });
      const hora = getHoraReport(equipe);
      const html = formatReportHtml(hora, pngDataUrl);

      await copyFormattedHtml(html);

      // Toast de sucesso removido a pedido — o próprio botão já vira
      // "Copiado" (ícone + texto, ver estado "done" abaixo) por 2s, feedback
      // suficiente sem o popup extra.
      setState("done");

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-table] erro:", err);
      setState("idle");
      toast.error("Não foi possível copiar", {
        description: "Tente em outro navegador (Chrome/Edge)",
        className: "reports-consolidado-toast",
      });
    } finally {
      onCapturaFim?.();
    }
  }

  return (
    // Mesma família visual de /kpi/operadores (CopyKpiButton): botão outline
    // h-8, min-w fixo (cabe "Copiar imagem") — troca de ícone/texto entre
    // estados não desloca o layout ao redor.
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === "copying"}
      className={cn(
        "font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 min-w-[140px] items-center justify-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
      )}
    >
      {state === "copying" && (
        <span className="inline-flex items-center gap-1.5">
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          <span>Gerando...</span>
        </span>
      )}
      {state === "done" && (
        <span className="inline-flex items-center gap-1.5" style={{ color: "var(--success)" }}>
          <IconCheck size={14} aria-hidden="true" />
          <span>Copiado</span>
        </span>
      )}
      {state === "idle" && (
        <span className="inline-flex items-center gap-1.5">
          <IconCamera size={14} aria-hidden="true" />
          <span>Copiar imagem</span>
        </span>
      )}
    </button>
  );
}
