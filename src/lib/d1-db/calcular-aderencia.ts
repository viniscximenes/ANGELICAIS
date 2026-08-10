import { getEmailPrefix } from "@/lib/utils/email-variants";
import type { PausaProgramadaDb } from "@/lib/bases/pausas-programadas/types";

/**
 * Aderência de horários do analítico de Tempo/Indisp — compara os horários
 * REAIS do dia (d1_tempo_logado + d1_indisponibilidade) com os horários
 * PROGRAMADOS (base_pausas_programadas). Sem relação com db_pausas_diario
 * nem com a config de aderência do Diário de Bordo.
 *
 * A hora real de cada pausa vem de d1_indisponibilidade.pausa10_1_hora_inicio
 * / pausa10_2_hora_inicio / pausa20_hora_inicio, extraídas do CSV a partir do
 * upload que passou a capturar essa coluna — uploads anteriores a isso não
 * têm o dado (fica null / "—" na UI, nunca inventado).
 *
 * Logout não entra nesta comparação (fora do escopo da aderência).
 */

/** Horas reais do dia usadas na comparação — um campo por item da tabela. */
export type HorasReaisAderencia = {
  login: string | null;
  pausa10Primeira: string | null;
  pausa20: string | null;
  pausa10Segunda: string | null;
};

export type AderenciaItem = {
  label: string;
  horaForecast: string | null;
  horaReal: string | null;
  /** Real - Forecast, em minutos. null quando um dos dois lados falta. */
  diferencaMin: number | null;
  /** null = N/D (não calculável). */
  dentroTolerancia: boolean | null;
};

export type AderenciaOperador = {
  /** null quando o operador não está cadastrado em base_pausas_programadas. */
  forecast: PausaProgramadaDb | null;
  items: AderenciaItem[];
  /** % dos items calculáveis dentro da tolerância. null se nenhum item é calculável. */
  percentualTotal: number | null;
};

const ADERENCIA_VAZIA: AderenciaOperador = {
  forecast: null,
  items: [],
  percentualTotal: null,
};

/** Índice de forecasts por PREFIXO de e-mail — mesma convenção de get-gestor-*.ts. */
export function buildForecastPorOperador(
  pausasProgramadas: PausaProgramadaDb[],
): Map<string, PausaProgramadaDb> {
  return new Map(pausasProgramadas.map((p) => [getEmailPrefix(p.operatorEmail), p]));
}

function paraMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = hora.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatarHoraCurta(hora: string | null | undefined): string | null {
  if (!hora) return null;
  const m = hora.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function calcularItem(
  label: string,
  horaReal: string | null,
  horaForecast: string | null,
  toleranciaMin: number,
): AderenciaItem {
  const minReal = paraMinutos(horaReal);
  const minForecast = paraMinutos(horaForecast);
  const diferencaMin =
    minReal !== null && minForecast !== null ? minReal - minForecast : null;

  return {
    label,
    horaForecast: formatarHoraCurta(horaForecast),
    horaReal: formatarHoraCurta(horaReal),
    diferencaMin,
    dentroTolerancia:
      diferencaMin === null ? null : Math.abs(diferencaMin) <= toleranciaMin,
  };
}

/**
 * Variante assimétrica para Login:
 * - Adiantado (diferencaMin < 0) → sempre positivo (logou antes = ok)
 * - Atrasado até toleranciaMin → positivo
 * - Atrasado mais de toleranciaMin → negativo
 */
function calcularItemLogin(
  horaReal: string | null,
  horaForecast: string | null,
  toleranciaMin: number,
): AderenciaItem {
  const minReal = paraMinutos(horaReal);
  const minForecast = paraMinutos(horaForecast);
  const diferencaMin =
    minReal !== null && minForecast !== null ? minReal - minForecast : null;

  let dentroTolerancia: boolean | null = null;
  if (diferencaMin !== null) {
    // negativo = adiantado → sempre ok
    // positivo = atrasado → ok só se dentro da tolerância
    dentroTolerancia = diferencaMin <= toleranciaMin;
  }

  return {
    label: "Login",
    horaForecast: formatarHoraCurta(horaForecast),
    horaReal: formatarHoraCurta(horaReal),
    diferencaMin,
    dentroTolerancia,
  };
}

/** Calcula a aderência de um operador: cada item compara hora real x programada. */
export function calcularAderenciaOperador(
  emailOperador: string,
  horasReais: HorasReaisAderencia,
  forecastPorOperador: Map<string, PausaProgramadaDb>,
  toleranciaMin: number,
): AderenciaOperador {
  const forecast = forecastPorOperador.get(getEmailPrefix(emailOperador)) ?? null;

  if (!forecast) return { ...ADERENCIA_VAZIA };

  const items: AderenciaItem[] = [
    calcularItemLogin(horasReais.login, forecast.horaLogin, toleranciaMin),
    calcularItem("1ª Pausa 10", horasReais.pausa10Primeira, forecast.descanso1, toleranciaMin),
    calcularItem("Pausa 20", horasReais.pausa20, forecast.pausa20, toleranciaMin),
    calcularItem("2ª Pausa 10", horasReais.pausa10Segunda, forecast.descanso2, toleranciaMin),
  ];

  const calculaveis = items.filter((i) => i.dentroTolerancia !== null);
  const percentualTotal =
    calculaveis.length > 0
      ? (calculaveis.filter((i) => i.dentroTolerancia).length / calculaveis.length) * 100
      : null;

  return { forecast, items, percentualTotal };
}
