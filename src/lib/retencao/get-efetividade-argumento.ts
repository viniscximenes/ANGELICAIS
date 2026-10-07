import { lerLoteOuFonte, type LinhaAtendimento } from "./ler-lote";
import { dedupePorContrato } from "./dedupe-por-contrato";
import { classificarAtendimento } from "./classificar-atendimento";
import { aplicarFiltroEscopo } from "./escopo";

export type ArgumentoItem = {
  categoria: string;
  quantidade: number;
  /** Fração 0-1 do total de retidos — não é "tx de retenção" (ver comentário do arquivo). */
  percentualDoTotal: number;
};

const SEM_CATEGORIA = "Sem categoria";

type LinhaCrua = {
  usuario_login: string | null;
  cod_air: string | null;
  status_hora: string | null;
  foi_cancelamento: boolean | null;
  status_retencao: string | null;
  primeiro_nivel: string | null;
};

/**
 * Volume de contratos RETIDOS por técnica de negociação (`primeiro_nivel`).
 *
 * NÃO é uma "tx de retenção por técnica" — investigado nos dados reais:
 * `primeiro_nivel` é SEMPRE null em toda linha de cancelamento (foi_
 * cancelamento = true), 100% dos casos, sem exceção. Só aparece preenchido
 * quando há negociação registrada num desfecho de retenção. Sem cancelados
 * "daquela técnica" pra formar o denominador, uma "tx por técnica" seria
 * calculada sobre um total que não existe de forma consistente — mostrar
 * isso seria uma métrica formalmente calculável mas SEMANTICAMENTE falsa
 * (pareceria 100% em toda categoria, já que não há "fracasso" atribuível a
 * nenhuma). Por isso o card mostra só o VOLUME retido por técnica.
 *
 * `primeiro_nivel = "FaceID"` NÃO é mais critério de exclusão (mudança de
 * regra de negócio): um contrato retido automaticamente pelo fluxo de
 * FaceID entra aqui normalmente, categorizado como "FaceID" — é só mais uma
 * técnica/origem entre as demais.
 */
export async function getEfetividadeArgumento(
  emailsEquipe: string[],
  fonte?: readonly LinhaAtendimento[],
): Promise<ArgumentoItem[]> {
  const allData = await lerLoteOuFonte<LinhaCrua>(
    fonte,
    { emailsEquipe },
    (supabase) =>
      aplicarFiltroEscopo(
        supabase
          .from("retencao_atendimentos")
          .select("usuario_login, cod_air, status_hora, foi_cancelamento, status_retencao, primeiro_nivel"),
        { emailsEquipe },
      ),
    "getEfetividadeArgumento",
  );

  const linhasFinais = dedupePorContrato(allData);

  const porCategoria = new Map<string, number>();
  let totalRetidos = 0;

  for (const row of linhasFinais) {
    const classe = classificarAtendimento(row);
    if (classe !== "retido") continue;

    totalRetidos++;
    const categoria = row.primeiro_nivel?.trim() || SEM_CATEGORIA;
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + 1);
  }

  const result: ArgumentoItem[] = [...porCategoria.entries()].map(([categoria, quantidade]) => ({
    categoria,
    quantidade,
    percentualDoTotal: totalRetidos > 0 ? quantidade / totalRetidos : 0,
  }));

  return result.sort((a, b) => b.quantidade - a.quantidade);
}
