import type { KpiColoringType, KpiDirection, KpiValueType } from "@/lib/kpi/types";

export type DefasadosInfo = {
  temMeta: boolean;
  defasados: { user: string; valor: string }[];
};

export type GestorProprioKpiSerial = {
  slug: string;
  displayName: string;
  valor: number | null;
  valueType: KpiValueType;
  status: "success" | "warning" | "danger" | "neutral";
  metaPorLinha: number | null;
  direction: KpiDirection;
  thresholdRed: number | null;
  thresholdYellow: number | null;
  coloringType: KpiColoringType;
};

export type GestorProprioSerial = {
  mesRef: string;
  isMesPassado: boolean;
  dataCorte: string | null;
  hasData: boolean;
  principais: GestorProprioKpiSerial[];
  secundarios: GestorProprioKpiSerial[];
};
