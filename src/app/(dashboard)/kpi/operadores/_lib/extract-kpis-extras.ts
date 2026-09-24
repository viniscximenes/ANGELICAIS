import type { KpiEquipeGestorData } from "@/lib/kpi/gestor/types";

import { MULTIPLICADOR_SLUG, TEMPO_LOGIN_SLUG, TEMPO_PROJETADO_SLUG } from "./kpi-colunas-local";

export interface KpiExtrasOperador {
  tempoProjetado: number | null;
  tempoLogin: number | null;
  multiplicador: number | null;
}

/** email (lowercase, trim) → valores extras. */
export type KpiExtrasPorEmail = Record<string, KpiExtrasOperador>;

/**
 * tempo_projetado / tempo_login / multiplicador JÁ existem em
 * kpi_definitions (group_type "secundario") e por isso já vêm preenchidos
 * nos Maps kpisPrincipal/kpisSecundario de KpiEquipeGestorData (dado cru,
 * antes de toKpiEquipeSerial) — só não sobrevivem à conversão pra
 * KpiEquipeSerial porque SECUNDARIO_SLUGS_ORDER (serial-types.ts,
 * compartilhado, NÃO alterado) não os lista.
 *
 * Extraídos aqui, no server (page.tsx), a partir do dado cru — sem tocar em
 * serial-types.ts — e repassados à parte pro client.
 */
export function extractKpisExtras(data: KpiEquipeGestorData): KpiExtrasPorEmail {
  const out: KpiExtrasPorEmail = {};
  for (const op of data.operadores) {
    const key = op.email.trim().toLowerCase();
    const get = (slug: string): number | null =>
      op.kpisPrincipal.get(slug)?.valor ?? op.kpisSecundario.get(slug)?.valor ?? null;
    out[key] = {
      tempoProjetado: get(TEMPO_PROJETADO_SLUG),
      tempoLogin: get(TEMPO_LOGIN_SLUG),
      multiplicador: get(MULTIPLICADOR_SLUG),
    };
  }
  return out;
}
