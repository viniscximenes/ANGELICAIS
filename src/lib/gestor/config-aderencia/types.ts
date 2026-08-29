/**
 * Config de aderência de pausas do gestor — horários esperados de login e das
 * três pausas do dia, mais a tolerância. Persistida em
 * `gestor_config_fantasia.config_aderencia` (jsonb), a mesma linha que já
 * guarda nome fantasia, meta de TX e ordem da tabela.
 *
 * As chaves do jsonb são snake_case (padrão do banco); o tipo exposto ao app
 * é camelCase. A conversão fica em get-config-aderencia.ts e na action.
 */
export type ConfigAderencia = {
  /** "HH:MM" esperado de login de quem entra de manhã. */
  metaLoginManha: string;
  /** "HH:MM" esperado de login de quem entra à tarde. */
  metaLoginTarde: string;
  /** "HH:MM" esperado da 1ª Pausa 10. */
  metaP10Primeira: string;
  /** "HH:MM" esperado da Pausa 20. */
  metaP20: string;
  /** "HH:MM" esperado da 2ª Pausa 10. */
  metaP10Segunda: string;
  /** Janela aceita em minutos, para mais e para menos. */
  toleranciaMin: number;
};

/** Espelha o DEFAULT da coluna no banco — os dois precisam concordar. */
export const DEFAULT_CONFIG_ADERENCIA: ConfigAderencia = {
  metaLoginManha: "07:40",
  metaLoginTarde: "14:00",
  metaP10Primeira: "10:00",
  metaP20: "12:00",
  metaP10Segunda: "15:00",
  toleranciaMin: 10,
};

/** Forma crua da coluna jsonb. */
type ConfigAderenciaRow = {
  meta_login_manha?: unknown;
  meta_login_tarde?: unknown;
  meta_p10_1?: unknown;
  meta_p20?: unknown;
  meta_p10_2?: unknown;
  tolerancia_min?: unknown;
};

/** "HH:MM" (aceita "H:MM" e "HH:MM:SS", normalizando para "HH:MM"). */
function normalizarHoraMeta(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const m = valor.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;

  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;

  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Tolerância válida: inteiro de 0 a 120 minutos. */
function normalizarTolerancia(valor: unknown): number | null {
  const n = typeof valor === "string" ? parseInt(valor, 10) : valor;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const inteiro = Math.round(n);
  if (inteiro < 0 || inteiro > 120) return null;
  return inteiro;
}

/**
 * Converte a coluna jsonb no tipo do app, campo a campo: qualquer valor
 * ausente ou malformado cai no default individualmente, então uma chave
 * corrompida não derruba as outras cinco.
 */
export function parseConfigAderencia(raw: unknown): ConfigAderencia {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG_ADERENCIA };
  const row = raw as ConfigAderenciaRow;

  return {
    metaLoginManha:
      normalizarHoraMeta(row.meta_login_manha) ?? DEFAULT_CONFIG_ADERENCIA.metaLoginManha,
    metaLoginTarde:
      normalizarHoraMeta(row.meta_login_tarde) ?? DEFAULT_CONFIG_ADERENCIA.metaLoginTarde,
    metaP10Primeira:
      normalizarHoraMeta(row.meta_p10_1) ?? DEFAULT_CONFIG_ADERENCIA.metaP10Primeira,
    metaP20: normalizarHoraMeta(row.meta_p20) ?? DEFAULT_CONFIG_ADERENCIA.metaP20,
    metaP10Segunda:
      normalizarHoraMeta(row.meta_p10_2) ?? DEFAULT_CONFIG_ADERENCIA.metaP10Segunda,
    toleranciaMin:
      normalizarTolerancia(row.tolerancia_min) ?? DEFAULT_CONFIG_ADERENCIA.toleranciaMin,
  };
}
