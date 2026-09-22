import { createAdminClient } from "@/lib/supabase/admin";
import type { RechamadaItem } from "./get-gestor-tma-analitico";

/** "HH:MM:SS" -> "HH:MM". Formato inesperado: devolve a string original. */
function horaCurta(hora: string | null): string {
  if (!hora) return "—";
  const partes = hora.split(":");
  return partes.length >= 2 ? `${partes[0]}:${partes[1]}` : hora;
}

/**
 * Rechamada do card do Analítico da TMA — escopo mudou nesta rodada: conta
 * como rechamada quando a PRIMEIRA ligação do dia daquele telefone foi
 * atendida por um operador do gestorId logado, INDEPENDENTE de qual equipe
 * atendeu a(s) ligação(ões) seguinte(s) (pode ser a mesma equipe ou outra —
 * fila/skill roteia entre equipes, então isso é esperado). Antes o cálculo
 * só enxergava telefones repetidos DENTRO da própria equipe.
 *
 * Por isso busca d1_tma_atendimentos SEM filtro de gestor_id — precisa
 * enxergar o polo inteiro pra saber se um telefone voltou em OUTRA equipe.
 * Sem join com d1_operadores_gestor: `gestor_id` na própria linha já é
 * confiável (o pipeline de upload descarta quem não bate com o roster antes
 * de gravar — zero atendimentos órfãos, confirmado no banco).
 */
export async function getRechamadaPoloTma(gestorId: string, dataRef: string): Promise<RechamadaItem[]> {
  const admin = createAdminClient();

  // Paginado em blocos de 1000 — o polo inteiro passa fácil de 1000 linhas
  // num dia cheio (~1600-3000), e o limite padrão do Supabase/PostgREST é
  // 1000 linhas por request; sem paginação a query trunca silenciosamente
  // (bug real, encontrado e corrigido nesta rodada — comparado com uma
  // contagem direta no banco). MESMO padrão já usado em
  // get-visao-geral.ts/get-evolucao-hora.ts (Consolidado) para o mesmo
  // problema, com tabelas igualmente grandes.
  type LinhaAtendimento = {
    telefone_cliente: string | null;
    operator_email: string;
    hora: string | null;
    gestor_id: string;
  };
  let atendimentos: LinhaAtendimento[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await admin
      .from("d1_tma_atendimentos")
      .select("telefone_cliente, operator_email, hora, gestor_id")
      .eq("data_ref", dataRef)
      .not("telefone_cliente", "is", null)
      .range(from, to);

    if (error) {
      console.error("[get-rechamada-polo-tma] erro:", error.message);
      return [];
    }

    const lista = data ?? [];
    atendimentos = atendimentos.concat(lista);

    if (lista.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  const porTelefone = new Map<string, typeof atendimentos>();
  for (const at of atendimentos) {
    if (!at.telefone_cliente) continue;
    const lista = porTelefone.get(at.telefone_cliente) ?? [];
    lista.push(at);
    porTelefone.set(at.telefone_cliente, lista);
  }

  const lista: RechamadaItem[] = [];
  for (const [telefone, doTelefoneBruto] of porTelefone) {
    if (doTelefoneBruto.length <= 1) continue;

    const doTelefone = [...doTelefoneBruto].sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""));
    const primeiro = doTelefone[0];
    const ultimo = doTelefone[doTelefone.length - 1];

    // Só entra se o PRIMEIRO atendimento do dia foi do gestor logado —
    // critério confirmado (não importa quem atendeu depois).
    if (primeiro.gestor_id !== gestorId) continue;

    lista.push({
      telefoneCliente: telefone,
      emailLocalPrimeiro: primeiro.operator_email.split("@")[0] ?? primeiro.operator_email,
      horaPrimeiro: horaCurta(primeiro.hora),
      emailLocalUltimo: ultimo.operator_email.split("@")[0] ?? ultimo.operator_email,
      horaUltimo: horaCurta(ultimo.hora),
    });
  }

  lista.sort((a, b) => a.horaPrimeiro.localeCompare(b.horaPrimeiro));
  return lista;
}
