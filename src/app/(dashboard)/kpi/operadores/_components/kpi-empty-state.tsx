"use client";

import { KpiFrame } from "./kpi-frame";

/**
 * Moldura local para os estados vazio/erro/"sem importação do mês" da
 * tabela — substitui o StyledCard usado antes nesses estados (removeria a
 * dependência de shadow-zinc-950/5 nesta rota). Reaproveita as cantoneiras
 * de KpiFrame (mesma moldura da tabela real), texto em
 * var(--muted-foreground), fonte da página (font-sans, não mono) e sem
 * sombra.
 */
export function KpiEmptyState({ mensagem }: { mensagem: string }) {
  return (
    <KpiFrame className="flex min-h-[160px] items-center justify-center px-6 py-10 text-center">
      <p className="font-sans text-sm text-muted-foreground">{mensagem}</p>
    </KpiFrame>
  );
}
