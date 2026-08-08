import { formatSecondsAsHHMMSS } from "@/lib/diario/time-format";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import type { TemaTipo } from "./types";

export type GerarTextoInput = {
  tipo: TemaTipo;
  agentUsername: string;
  dataRef: string; // YYYY-MM-DD
  reasonCode: string | null;
  duracaoSeg: number;
  textoMotivo: string;
};

/**
 * Função pura (sem acesso a banco) — usada tanto no client, pra prévia do
 * texto ao trocar o tema no dropdown, quanto no server, na hora de
 * finalizar o registro. Os dois templates vêm de docs/pages/diario-de-bordo.md.
 */
export function gerarTexto(input: GerarTextoInput): string {
  const dataFormatada = formatDateBR(input.dataRef);
  const duracaoFormatada = formatSecondsAsHHMMSS(input.duracaoSeg);

  if (input.tipo === "pausa") {
    return `O agente ${input.agentUsername} no dia ${dataFormatada} teve que registrar por pedido da supervisão a pausa ${input.reasonCode ?? ""} por ${duracaoFormatada} devido ${input.textoMotivo}.`;
  }

  return `No dia ${dataFormatada}, o agente ${input.agentUsername} ${input.textoMotivo}, conseguindo realizar apenas ${duracaoFormatada} de tempo logado.`;
}
