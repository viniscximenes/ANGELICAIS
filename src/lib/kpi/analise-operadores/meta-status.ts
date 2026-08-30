/**
 * Classificação do `meta_status` mensal do operador (kpi_monthly_snapshots,
 * kpi_slug = 'meta_status', valor em valor_texto).
 *
 * É POR MÊS — dá pra saber que o operador estava afastado num mês
 * específico. Meses "fora de operação" (afastado/desligado) não são dado de
 * performance: saem da média e do quartil e viram gap no gráfico.
 *
 * Módulo puro (sem imports de servidor) — usado no server (agregação) e no
 * client (rótulo do marcador).
 */
export type StatusOperadorMes = "ativo" | "afastado" | "desligado";

function normalizar(valorTexto: string | null | undefined): string {
  return (valorTexto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * "ativo" cobre ATIVO / Ativo / ATIVO - TREINAMENTO / Treinamento / "-" /
 * AVISO / null / lixo de parsing. "afastado" = ausência temporária
 * (férias, afastamento, licença, movimentação). "desligado" = fim de
 * vínculo — tratado igual tecnicamente, mas com rótulo próprio.
 */
export function classificarStatusOperadorMes(
  valorTexto: string | null | undefined,
): StatusOperadorMes {
  const v = normalizar(valorTexto);
  if (!v) return "ativo";
  if (v.startsWith("DESLIGADO")) return "desligado";
  if (
    v.startsWith("FERIAS") ||
    v.startsWith("AFASTAMENTO") ||
    v.startsWith("AF.PREV") ||
    v.startsWith("LICENCA") ||
    v.startsWith("MOVIMENTACAO")
  ) {
    return "afastado";
  }
  return "ativo";
}

/** Mês não representa performance real → fora de média/quartil, gap no gráfico. */
export function foraDeOperacao(status: StatusOperadorMes): boolean {
  return status === "afastado" || status === "desligado";
}

/**
 * Rótulo amigável do marcador — mapeado 1:1 do valor_texto ORIGINAL
 * normalizado daquele mês, NÃO do nome do grupo. `null` = mês ativo (sem
 * marcador). Ordem importa: "AF.PREV"/"AFASTAMENTO PREVIDENCIA" antes de
 * "AFASTAMENTO"; "LICENCA MATERNIDADE" antes de "LICENCA".
 */
export function rotuloMetaStatus(
  valorTexto: string | null | undefined,
): string | null {
  const v = normalizar(valorTexto);
  if (!v) return null;
  if (v.startsWith("DESLIGADO")) return "Desligado";
  if (v.startsWith("FERIAS")) return "Férias";
  if (v.startsWith("AF.PREV") || v.startsWith("AFASTAMENTO PREV")) {
    return "Afastamento (Previdência)";
  }
  if (v.startsWith("AFASTAMENTO")) return "Afastamento";
  if (v.startsWith("LICENCA MATERNIDADE")) return "Licença Maternidade";
  if (v.startsWith("LICENCA")) return "Licença";
  if (v.startsWith("MOVIMENTACAO")) return "Movimentação";
  return null;
}
