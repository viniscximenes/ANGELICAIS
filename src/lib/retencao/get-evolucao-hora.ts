import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";

export type HoraEvolucaoData = {
  hora: number; // 0-23
  label: string; // "08:00"
  total: number;
  retidos: number;
  cancelados: number;
  tx: number | null; // null se total = 0
};

/**
 * Consulta a evolução da taxa de retenção e volume hora a hora (ou minuto a minuto de 10 em 10 min se uma hora única estiver filtrada) para o turno selecionado.
 */
export async function getEvolucaoHora(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  turno: "manha" | "tarde",
  periodo: { horaInicio: number; horaFim: number } | null,
): Promise<HoraEvolucaoData[]> {
  const supabase = createAdminClient();

  const isSingleHour = periodo !== null && periodo.horaInicio === periodo.horaFim;

  if (isSingleHour) {
    const H = periodo.horaInicio;
    const minuteBuckets = [0, 10, 20, 30, 40, 50, 59];

    let query = supabase
      .from("retencao_atendimentos")
      .select("status_hora, foi_cancelamento")
      .range(0, 9999);

    query = aplicarFiltroEscopo(query, {
      escopo,
      emailsEquipe,
      periodo,
    });

    const { data, error } = await query;
    if (error) {
      console.error("[getEvolucaoHora] erro ao buscar evolução por minuto:", error.message);
      throw new Error(error.message);
    }

    const list = data || [];
    const map: Record<number, { total: number; retidos: number; cancelados: number }> = {};
    for (const m of minuteBuckets) {
      map[m] = { total: 0, retidos: 0, cancelados: 0 };
    }

    for (const item of list) {
      if (!item.status_hora) continue;
      const tParts = item.status_hora.split("T");
      if (tParts.length < 2) continue;
      const timePart = tParts[1];
      const timeSubParts = timePart.split(":");
      if (timeSubParts.length < 2) continue;
      const m = parseInt(timeSubParts[1], 10);

      let bucket = 59;
      if (m >= 0 && m < 10) bucket = 0;
      else if (m >= 10 && m < 20) bucket = 10;
      else if (m >= 20 && m < 30) bucket = 20;
      else if (m >= 30 && m < 40) bucket = 30;
      else if (m >= 40 && m < 50) bucket = 40;
      else if (m >= 50 && m < 59) bucket = 50;

      const isCancel = item.foi_cancelamento === true;
      map[bucket].total++;
      if (isCancel) {
        map[bucket].cancelados++;
      } else {
        map[bucket].retidos++;
      }
    }

    const H_str = String(H).padStart(2, "0");
    return minuteBuckets.map((m) => {
      const obj = map[m];
      const tx = obj.total > 0 ? obj.retidos / obj.total : null;
      return {
        hora: H,
        label: `${H_str}:${String(m).padStart(2, "0")}`,
        total: obj.total,
        retidos: obj.retidos,
        cancelados: obj.cancelados,
        tx,
      };
    });
  }

  const horasTurno = turno === "manha" ? [8, 9, 10, 11, 12, 13] : [14, 15, 16, 17, 18, 19];
  const horaInicio = horasTurno[0];
  const horaFim = horasTurno[horasTurno.length - 1];

  let query = supabase
    .from("retencao_atendimentos")
    .select("hora_bucket, foi_cancelamento")
    .range(0, 9999);

  query = aplicarFiltroEscopo(query, {
    escopo,
    emailsEquipe,
    periodo: { horaInicio, horaFim },
  });

  const { data, error } = await query;
  if (error) {
    console.error("[getEvolucaoHora] erro ao buscar evolução por hora:", error.message);
    throw new Error(error.message);
  }

  const list = data || [];

  const map: Record<number, Omit<HoraEvolucaoData, "label" | "hora">> = {};
  for (const h of horasTurno) {
    map[h] = {
      total: 0,
      retidos: 0,
      cancelados: 0,
      tx: null,
    };
  }

  for (const item of list) {
    const h = item.hora_bucket;
    if (h !== null && h !== undefined && map[h] !== undefined) {
      const isCancel = item.foi_cancelamento === true;
      const hObj = map[h];
      hObj.total++;
      if (isCancel) {
        hObj.cancelados++;
      } else {
        hObj.retidos++;
      }
    }
  }

  const result: HoraEvolucaoData[] = horasTurno.map((h) => {
    const hObj = map[h];
    const tx = hObj.total > 0 ? hObj.retidos / hObj.total : null;
    return {
      hora: h,
      label: `${String(h).padStart(2, "0")}:00`,
      total: hObj.total,
      retidos: hObj.retidos,
      cancelados: hObj.cancelados,
      tx,
    };
  });

  return result;
}
