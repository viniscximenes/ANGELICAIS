import { fetchConsolidado } from "./consolidado";
import { fetchContratos } from "./contratos";
import { fetchMotivos } from "./motivo";
import type { D1Data } from "./types";

export type * from "./types";
export { fetchConsolidado, fetchContratos, fetchMotivos };

export async function getD1Data(): Promise<D1Data> {
  const [consolidado, contratos, motivos] = await Promise.all([
    fetchConsolidado(),
    fetchContratos(),
    fetchMotivos(),
  ]);

  return { consolidado, contratos, motivos };
}
