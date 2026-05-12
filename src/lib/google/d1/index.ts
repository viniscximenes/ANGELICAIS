import { fetchConsolidado } from "./consolidado";
import { fetchContratos } from "./contratos";
import { fetchMotivos } from "./motivo";
import type { D1Data } from "./types";

export type * from "./types";
export { fetchConsolidado, fetchContratos, fetchMotivos };

export async function getD1Data(): Promise<D1Data> {
  console.log("[d1] iniciando getD1Data");
  const start = Date.now();
  const [consolidado, contratos, motivos] = await Promise.all([
    fetchConsolidado(),
    fetchContratos(),
    fetchMotivos(),
  ]);
  console.log("[d1] getD1Data completo em", Date.now() - start, "ms");
  return { consolidado, contratos, motivos };
}
