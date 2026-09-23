/**
 * Deduplica linhas de retencao_atendimentos por (operador, contrato) ANTES
 * de classificar/contar — causa raiz confirmada com dados reais (ver
 * bruno.roberto, 19/09: contrato 244309 e 949578 apareciam 3x cada,
 * inflando retidos/pedidos/tx_retencao no d1_consolidado).
 *
 * A base bruta (export Sydle/AIR) tem MÚLTIPLAS LINHAS pro MESMO contrato
 * quando há várias tentativas de atendimento no mesmo dia — confirmado no
 * banco: um contrato pode ter 2 linhas "Abortado - FaceID não realizado"
 * seguidas de uma linha final "Não retido - Cancelado" (ou uma retenção),
 * todas com o MESMO cod_air, status_hora crescente. São tentativas
 * sequenciais do MESMO caso, não atendimentos independentes — contar cada
 * linha como um atendimento próprio infla os totais.
 *
 * Regra: mantém só a linha de `status_hora` MAIS RECENTE por
 * (usuario_login, cod_air) — as anteriores são histórico do mesmo caso.
 * Linhas sem cod_air (não deveria acontecer na prática, mas por segurança)
 * NÃO são deduplicadas entre si — cada uma conta como um caso próprio, pra
 * não juntar registros que não têm chave nenhuma em comum.
 */
export function dedupePorContrato<
  T extends {
    usuario_login?: string | null;
    cod_air?: string | null;
    status_hora?: string | null;
  },
>(rows: T[]): T[] {
  const porChave = new Map<string, T>();
  const semChave: T[] = [];

  for (const row of rows) {
    const codAir = row.cod_air?.trim();
    if (!codAir) {
      semChave.push(row);
      continue;
    }

    const chave = `${(row.usuario_login ?? "").trim().toLowerCase()}::${codAir}`;
    const atual = porChave.get(chave);
    // Comparação lexicográfica de string: status_hora é ISO com offset fixo
    // (mesmo formato em toda a base), então ordena cronologicamente igual a
    // uma comparação de Date, sem precisar parsear.
    if (!atual || (row.status_hora ?? "") > (atual.status_hora ?? "")) {
      porChave.set(chave, row);
    }
  }

  return [...porChave.values(), ...semChave];
}
