import { classificarAtendimento, type ClassificacaoAtendimento } from "./classificar-atendimento";

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

/**
 * Contratos (cod_air) que tiveram, em QUALQUER linha do lote (qualquer
 * tentativa, qualquer agente — não só a linha final), pelo menos um sinal de
 * fluxo automático de FaceID: `status_retencao` começando com
 * "Abortado - FaceID" (variantes reais confirmadas: "não realizado",
 * "reprovado") OU `primeiro_nivel = "FaceID"`.
 *
 * EVIDÊNCIA que forçou essa regra mais ampla (substituindo uma versão
 * anterior que só olhava a linha final já deduplicada): contrato 244309,
 * bruno.roberto — 3 tentativas, TODAS "Abortado - FaceID não realizado",
 * TODAS com `primeiro_nivel = null` (não "FaceID"). A retenção final
 * registrada pro mesmo contrato (vista em produção, fora dessas 3 linhas)
 * não carrega nenhum marcador de FaceID na sua própria linha — mas o caso
 * inteiro só existe porque passou pelo fluxo automático antes. Isso prova
 * que `primeiro_nivel`/`status_retencao` são inconsistentes NA ORIGEM (não
 * confiáveis linha a linha): a origem do caso importa mais que o rótulo da
 * linha que fechou o dia. Por segurança, qualquer contrato que já tocou
 * FaceID em algum momento é banido do cálculo por inteiro, mesmo que o
 * desfecho final pareça uma retenção manual normal.
 *
 * Escopo: por cod_air SOZINHO, sem cruzar com usuario_login — o mesmo
 * contrato pode ter sido tocado por agentes diferentes entre as tentativas.
 */
export function contratosTocadosPorFaceId<
  T extends {
    cod_air?: string | null;
    status_retencao?: string | null;
    primeiro_nivel?: string | null;
  },
>(rows: T[]): Set<string> {
  const contratos = new Set<string>();

  for (const row of rows) {
    const codAir = row.cod_air?.trim();
    if (!codAir) continue;

    const status = (row.status_retencao ?? "").trim().toLowerCase();
    const nivel = (row.primeiro_nivel ?? "").trim().toLowerCase();

    if (status.startsWith("abortado - faceid") || nivel === "faceid") {
      contratos.add(codAir);
    }
  }

  return contratos;
}

/**
 * Classifica a linha final de um contrato (já deduplicada) considerando o
 * histórico completo de FaceID — MAS só quando a classificação "crua" der
 * "retido". Ver `contratosTocadosPorFaceId` pro que conta como histórico.
 *
 * CORREÇÃO (regra anterior era ampla demais e apagava CANCELAMENTOS
 * legítimos do total): a versão anterior bania o contrato inteiro do
 * cálculo — retido OU cancelado — assim que qualquer linha tocasse FaceID.
 * Caso real que expôs o problema: contrato 5668002 (bruno.roberto) tem
 * "Abortado - FaceID não realizado" às 22:27 e, 8min depois, a linha FINAL
 * "Não retido - Cancelado" às 22:35 — um cancelamento normal, sem nada de
 * "retenção automática disfarçada". A regra antiga fazia esse contrato
 * SUMIR também de cancelados, não só de retidos.
 *
 * Regra corrigida: histórico de FaceID só pode DERRUBAR uma classificação
 * "retido" pra "abortado" (proteção contra retenção automática travestida
 * de manual, ver contrato 244309 na correção anterior). Nunca deve mexer
 * num desfecho "cancelado" — se o caso terminou cancelado, ele SEMPRE conta
 * como cancelado, não importa o que aconteceu nas tentativas anteriores.
 */
export function classificarComHistoricoFaceId<
  T extends {
    cod_air?: string | null;
    foi_cancelamento: boolean | null;
    status_retencao?: string | null;
    primeiro_nivel?: string | null;
  },
>(row: T, contratosComFaceId: Set<string>): ClassificacaoAtendimento {
  const classe = classificarAtendimento(row);
  if (classe !== "retido") return classe;

  const codAir = row.cod_air?.trim();
  if (codAir && contratosComFaceId.has(codAir)) return "abortado";

  return classe;
}
