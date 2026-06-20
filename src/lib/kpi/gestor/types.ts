import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";

export type OperadorKpiEquipe = {
  email: string;    // email original (antes do alias)
  emailKpi: string; // email resolvido para busca no KPI (pode ser igual)
  nome: string;     // deriveNomeOperador(email)
  kpisPrincipal: Map<string, EnrichedKpiValue | NeutralKpiValue>;
  kpisSecundario: Map<string, EnrichedKpiValue | NeutralKpiValue>;
};

export type KpiEquipeGestorData = {
  operadores: OperadorKpiEquipe[];
  mesRef: string;
  isMesPassado: boolean;
  dataCorte: string | null;
};
