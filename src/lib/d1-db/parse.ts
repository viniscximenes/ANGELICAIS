import type { MotivosBreakdown } from "./types";

/**
 * Bucket de motivo em 6 categorias (retencao_atendimentos.motivo é texto
 * livre da fonte externa; isso agrupa nas 6 categorias do D-1 Consolidado
 * histórico).
 */
export function bucketMotivo(motivoRaw: string | null): keyof MotivosBreakdown {
  const mot = (motivoRaw || "").trim();

  if (
    mot === "Mud. Endereço Inviabilidade" ||
    mot === "Mud. Endereço Viabilidade / Parcial" ||
    mot === "Mudança de Endereço"
  ) {
    return "mudancaEndereco";
  }
  if (
    mot === "Problemas Financeiros" ||
    mot === "Problemas Faturamento" ||
    mot === "Reajuste de valor / NCC"
  ) {
    return "financeiro";
  }
  if (mot === "Insatisfação com o Atendimento") {
    return "insatisfacaoAtendimento";
  }
  if (
    mot === "Insatisfação com o Serviço" ||
    mot === "Insatisfação com o Produto"
  ) {
    return "insatisfacaoServico";
  }
  if (
    mot === "Mudança de Provedor - Qualidade" ||
    mot === "Mudança de Provedor - Preço" ||
    mot === "Mudança de Provedor -Preço"
  ) {
    return "mudancaProvedora";
  }
  // Óbito do Titular, Cliente diz já ter cancelado, Fraude Contratual, Área de
  // Risco, Cliente fez novo Plano com a Giga+, ou qualquer motivo não mapeado.
  return "outros";
}

export function zeroBreakdown(): MotivosBreakdown {
  return {
    financeiro: 0,
    mudancaEndereco: 0,
    insatisfacaoServico: 0,
    insatisfacaoAtendimento: 0,
    mudancaProvedora: 0,
    outros: 0,
  };
}

/** Segundos -> "HH:MM:SS". Nunca negativo (trava em 0). */
export function formatSegundosParaHora(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** "HH:MM:SS" -> segundos. Inválido/vazio -> 0. */
export function horaParaSegundos(hora: string | null | undefined): number {
  if (!hora) return 0;
  const m = hora.trim().match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
}

/** Hora atual em HH:MM, timezone America/Sao_Paulo. */
export function horaAtualBR(): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
}

/** Data de hoje em YYYY-MM-DD, timezone America/Sao_Paulo. */
export function dataRefHojeBR(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Soma report_hora + tempo_restante (aritmética de relógio, sem passar de
 * 23:59). Usado pra "logout estimado".
 */
export function somarHoraMaisSegundos(horaBase: string, segundosAAdicionar: number): string {
  const m = horaBase.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "—";
  const baseSeg = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60;
  const totalSeg = (baseSeg + segundosAAdicionar) % 86400;
  const h = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
