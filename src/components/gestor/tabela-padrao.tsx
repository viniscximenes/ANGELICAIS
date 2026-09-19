import type { CSSProperties, ReactNode } from "react";

/**
 * Estilos e helpers centralizados do padrão visual "tabela estilo planilha"
 * do painel do gestor — extraído literalmente de EquipeTable (a referência
 * original, /reports/consolidado) pra ser reaproveitado por TODAS as
 * tabelas do mesmo padrão (Equipe, Tempo Logado, Indisponibilidade),
 * eliminando qualquer chance de divergência por cópia manual entre elas.
 *
 * Vale só pra variante "screen" (o visual do site). A variante "excel"
 * (usada só no wrapper invisível de "copiar como imagem") tem paleta
 * própria e não usa nada daqui.
 */

export const TABELA_CONTAINER_CLASS =
  "elevation-1 overflow-hidden rounded-xl border border-border/80";

export const TABELA_HEADER_CLASS =
  "ds-mono-sm text-muted-foreground grid gap-0 font-bold tracking-wider uppercase bg-muted/40";

export const TABELA_HEADER_BORDA: CSSProperties = {
  borderBottom: "1px solid var(--border)",
};

/*
 * min-w-0 em TODAS as células (header e corpo) — causa raiz de um
 * desalinhamento crônico entre header e linhas de dado: como cada linha
 * (header, cada operador, totais) é uma instância de CSS Grid SEPARADA
 * (não uma única grade compartilhada), o `min-width` implícito de uma
 * célula grid é `auto` por padrão — ou seja, o conteúdo sem quebra
 * (whitespace-nowrap) pode forçar a coluna daquele grid específico a
 * ficar mais larga que sua fatia de `fr`, empurrando as OUTRAS colunas
 * daquele MESMO grid pra um espaço menor. Isso diverge do grid do corpo
 * (só números curtos, sem essa pressão), mesmo usando a MESMA string de
 * grid-template-columns nos dois. `min-w-0` remove esse mínimo implícito,
 * garantindo que a divisão por `fr` seja idêntica em toda instância de
 * grid, não importa o conteúdo de cada célula.
 */
// px-2 (não px-3, como as células de dado): "CANCELADOS"/"TX RETENÇÃO"
// (ds-body + tracking-wide) são as strings mais largas de toda a tabela —
// esses 8px a menos de cada lado é o que sobra de folga real pro texto não
// truncar, sem depender só de aumentar a largura total da tabela. Não
// quebra o alinhamento com as células de dado: min-w-0 garante que os
// TRACKS do grid (onde fica a linha divisória) continuam idênticos —
// padding diferente só muda quanto espaço sobra pro texto DENTRO da
// própria célula, não a posição da borda.
export const TABELA_HEADER_CELL_CLASS =
  "min-w-0 overflow-hidden text-ellipsis px-2 py-2.5 text-center border-r border-border/50 whitespace-nowrap";

/** Última célula do cabeçalho (sem coluna à direita) não leva border-r. */
export const TABELA_HEADER_CELL_ULTIMA_CLASS =
  "min-w-0 overflow-hidden text-ellipsis px-2 py-2.5 text-center whitespace-nowrap";

export const TABELA_LINHA_CLASS = "grid items-center gap-0 transition-colors hover:bg-muted/40";

export const TABELA_NOME_CELL_CLASS =
  "ds-body min-w-0 truncate px-3 py-2 text-center border-r border-border/30 font-medium";

export const TABELA_VALOR_CELL_CLASS =
  "ds-mono-sm min-w-0 px-3 py-2 text-center border-r border-border/30";

export const TABELA_VALOR_BULLET_CLASS =
  "ds-mono-sm min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 text-center border-r border-border/30";

/** Cor da coluna "nome do operador" — mesma régua nos 3 estados usados em EquipeTable. */
export function corNomeOperador(params: { semDado?: boolean; ruim: boolean }): string {
  if (params.semDado) return "var(--muted-foreground)";
  return params.ruim ? "var(--danger)" : "var(--foreground)";
}

/** Fundo sutil da linha problemática — mesmo tom/opacidade em toda tabela do padrão. */
export function fundoLinhaRuim(ruim: boolean): string | undefined {
  return ruim ? "color-mix(in oklch, var(--danger) 5%, transparent)" : undefined;
}

/** Cor do valor/bullet semântico: vermelho quando ruim, verde quando bom. */
function corSemantica(ruim: boolean): string {
  return ruim ? "var(--danger)" : "var(--success)";
}

/**
 * Valor semântico com bullet — mesmo padrão da coluna "Tx Retenção" do
 * EquipeTable: texto peso 600 (nem regular, nem full bold) + bolinha da
 * mesma cor. Usar pra QUALQUER coluna que seja "o veredito" da linha.
 */
export function ValorSemantico({ ruim, children }: { ruim: boolean; children: ReactNode }) {
  const cor = corSemantica(ruim);
  return (
    <>
      <span style={{ color: cor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </span>
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: cor }}
      />
    </>
  );
}

/** Placeholder "sem dado" — mesmo tom/estilo em toda tabela do padrão. */
export function ValorSemDado() {
  return <span className="text-muted-foreground">—</span>;
}
