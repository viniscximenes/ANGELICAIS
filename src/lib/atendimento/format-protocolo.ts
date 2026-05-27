import {
  AVISOS_CANCELAMENTO,
  MOTIVOS,
  OFERTAS_RECUSADAS,
  type ProtocoloState,
} from "./types";

export function formatProtocolo(state: ProtocoloState): string {
  const linhas: string[] = [];

  // 1. Dados confirmados
  if (state.dadosOk) linhas.push("dados ok");

  // 2. Motivo
  if (state.motivo) {
    const motivoLabel =
      MOTIVOS.find((m) => m.value === state.motivo)?.label.toLowerCase() ??
      state.motivo;
    linhas.push(`cliente deseja cancelar por motivo ${motivoLabel}`);
  }

  // 3. Resoluções
  const isCancelou = state.resolucoes.includes("cancelou");

  if (isCancelou) {
    linhas.push("cliente cancelou");

    // Ofertas recusadas condensadas
    if (state.ofertasRecusadas.length > 0) {
      const partes = state.ofertasRecusadas.map(
        (o) =>
          OFERTAS_RECUSADAS.find((x) => x.value === o)?.label.toLowerCase() ??
          o,
      );
      linhas.push(`cliente recusou ${partes.join(", ")}`);
    }

    // Avisos de cancelamento (1 por linha)
    for (const a of state.avisosCancelamento) {
      const label = AVISOS_CANCELAMENTO.find((av) => av.value === a)?.label;
      if (label) linhas.push(label);
    }
  } else {
    // Retenções: formato condensado em UMA linha
    const partesRetencao: string[] = [];

    if (state.resolucoes.includes("troca")) {
      const plano = state.planoTrocaTexto.trim();
      partesRetencao.push(plano ? `troca de plano ${plano}` : "troca de plano");
    }
    if (state.resolucoes.includes("desconto")) {
      const desc = state.descontoTexto.trim();
      partesRetencao.push(desc ? `desconto ${desc}` : "desconto");
    }
    if (state.resolucoes.includes("reparo")) {
      partesRetencao.push("reparo");
    }
    if (state.resolucoes.includes("prioridade_os")) {
      partesRetencao.push("prioridade na O.S");
    }
    if (state.resolucoes.includes("argumentacao")) {
      partesRetencao.push("argumentação");
    }
    if (state.resolucoes.includes("mudanca_endereco")) {
      partesRetencao.push("mudança de endereço");
    }
    if (state.resolucoes.includes("wifi_6")) {
      partesRetencao.push("wifi-6");
    }
    if (state.resolucoes.includes("mudanca_comodo")) {
      partesRetencao.push("mudança de cômodo sem custo");
    }
    if (state.resolucoes.includes("fidelidade_existente")) {
      partesRetencao.push("fidelidade existente");
    }

    if (partesRetencao.length > 0) {
      linhas.push(`cliente retido por ${partesRetencao.join(", ")}`);
    }

    // Aviso de retenção plano/desconto
    const ehPlanoOuDesconto =
      state.resolucoes.includes("desconto") ||
      state.resolucoes.includes("troca");
    if (ehPlanoOuDesconto && state.avisoRetencaoMarcado) {
      linhas.push("ciente da fidelidade renovada e proporcional de uso");
    }
  }

  return linhas.join("\n");
}
