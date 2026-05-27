export type ValidateRegraInput = {
  tempoMinMeses: number;
  tempoMaxMeses: number | null;
  descontoMaxPct: number;
  duracaoMeses: number;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateRegra(input: ValidateRegraInput): ValidationResult {
  if (input.tempoMinMeses < 0) {
    return { valid: false, error: "Tempo mínimo deve ser >= 0" };
  }

  if (
    input.tempoMaxMeses !== null &&
    input.tempoMaxMeses < input.tempoMinMeses
  ) {
    return { valid: false, error: "Tempo máximo deve ser >= tempo mínimo" };
  }

  if (input.descontoMaxPct < 1 || input.descontoMaxPct > 100) {
    return { valid: false, error: "Desconto máximo deve estar entre 1 e 100%" };
  }

  if (input.duracaoMeses <= 0) {
    return { valid: false, error: "Duração deve ser maior que 0" };
  }

  return { valid: true };
}
