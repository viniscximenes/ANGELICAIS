import { lerLoteOuFonte, type LinhaAtendimento } from "./ler-lote";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { aplicarFiltroEscopo } from "./escopo";
import { getEmailPrefix } from "@/lib/utils/email-variants";

export type OperadorFaceIdItem = {
  /** SEMPRE "nome.sobrenome" real (nunca nome fantasia) — ver comentário na função. */
  nomeSobrenome: string;
  naoRealizado: number;
  reprovado: number;
  total: number;
};

export type ImpactoFaceIdData = {
  /** Total de TENTATIVAS de FaceID abortadas (não realizado + reprovado) — conta cada linha, não contrato único. */
  total: number;
  naoRealizado: number;
  reprovado: number;
  /** Uma linha por operador da equipe com pelo menos 1 tentativa abortada, ordenado por total DESC. */
  porOperador: OperadorFaceIdItem[];
};

const STATUS_NAO_REALIZADO = "Abortado - FaceID não realizado";
const STATUS_REPROVADO = "Abortado - FaceID reprovado";

/**
 * Este card mede uma coisa simples e direta: TENTATIVAS de FaceID que não
 * deram certo (as duas variantes de aborto), contadas por LINHA (não por
 * contrato único/deduplicado — "tentativa" é o evento em si, não o desfecho
 * do caso).
 *
 * A regra de negócio de exclusão por histórico de FaceID (contrato inteiro
 * banido do cálculo de retidos por ter tocado FaceID em algum momento) foi
 * removida — a classificação de retido/cancelado agora é puramente por
 * linha (ver classificar-atendimento.ts). Este card não tem relação com
 * aquela regra: mede só tentativas abortadas, independente do desfecho do
 * contrato.
 *
 * ESCOPO: só a equipe do gestor (`aplicarFiltroEscopo`) — "quem da MINHA
 * equipe tentou FaceID e não conseguiu". Propriedade da própria linha
 * (usuario_login + status_retencao), não há cruzamento com outra equipe.
 */
export async function getImpactoFaceId(
  emailsEquipe: string[],
  fonte?: readonly LinhaAtendimento[],
): Promise<ImpactoFaceIdData> {
  const allData = await lerLoteOuFonte<{
    usuario_login: string | null;
    status_retencao: string | null;
  }>(
    fonte,
    { emailsEquipe },
    (supabase) =>
      aplicarFiltroEscopo(
        supabase.from("retencao_atendimentos").select("usuario_login, status_retencao"),
        { emailsEquipe },
      ),
    "getImpactoFaceId",
  );

  // Chave = PREFIXO do e-mail (mesma identidade da dedupe/agregação):
  // ana@alloha.com e ana@sumicity.net.br somam na mesma linha. `login` =
  // primeira variante vista, só para o nome exibido.
  const porOperadorMap = new Map<string, { login: string; naoRealizado: number; reprovado: number }>();
  let naoRealizado = 0;
  let reprovado = 0;

  for (const row of allData) {
    const status = (row.status_retencao ?? "").trim();
    const isNaoRealizado = status === STATUS_NAO_REALIZADO;
    const isReprovado = status === STATUS_REPROVADO;
    if (!isNaoRealizado && !isReprovado) continue;

    const login = (row.usuario_login ?? "").trim().toLowerCase();
    const chave = getEmailPrefix(login);
    const atual = porOperadorMap.get(chave) ?? { login, naoRealizado: 0, reprovado: 0 };
    if (isNaoRealizado) {
      naoRealizado++;
      atual.naoRealizado++;
    } else {
      reprovado++;
      atual.reprovado++;
    }
    porOperadorMap.set(chave, atual);
  }

  // nome.sobrenome real (NUNCA nome fantasia). Variantes de domínio da mesma
  // pessoa já foram somadas numa linha só (chave por prefixo, acima).
  const porOperador: OperadorFaceIdItem[] = [...porOperadorMap.values()]
    .map((v) => ({
      nomeSobrenome: formatNomeDotSobrenome(v.login),
      naoRealizado: v.naoRealizado,
      reprovado: v.reprovado,
      total: v.naoRealizado + v.reprovado,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total: naoRealizado + reprovado,
    naoRealizado,
    reprovado,
    porOperador,
  };
}
