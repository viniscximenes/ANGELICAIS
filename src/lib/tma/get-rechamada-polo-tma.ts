import { horaCurta } from "./format-tma";
import { lerAtendimentosTma } from "./ler-atendimentos-tma";
import type { RechamadaItem } from "./get-gestor-tma-analitico";

/**
 * Rechamada do card do Analítico da TMA: conta quando a PRIMEIRA ligação do
 * dia daquele telefone foi atendida por um operador do gestorId logado,
 * INDEPENDENTE de qual equipe atendeu a(s) seguinte(s) — a fila/skill roteia
 * entre equipes, então a volta do cliente pode cair em outra. (Uma versão
 * anterior só enxergava telefones repetidos DENTRO da própria equipe.)
 *
 * Por isso busca d1_tma_atendimentos SEM filtro de gestor_id — precisa
 * enxergar o polo inteiro pra saber se um telefone voltou em OUTRA equipe.
 * Sem join com d1_operadores_gestor: `gestor_id` na própria linha já é
 * confiável (o pipeline de upload descarta quem não bate com o roster antes
 * de gravar — zero atendimentos órfãos, confirmado no banco).
 */
export async function getRechamadaPoloTma(gestorId: string, dataRef: string): Promise<RechamadaItem[] | null> {
  // Paginado com ordenação estável e conferência do lote
  // (lerAtendimentosTma) — o polo inteiro passa fácil de 1000 linhas num dia
  // cheio (~1600-3000), o limite do PostgREST por request. Antes paginava
  // com .range() SEM ordem: o Postgres não garante a mesma ordem entre
  // requests, então páginas podiam repetir/pular linhas (auditoria
  // 2026-10-09). Erro: null — o Analítico mostra o estado de erro.
  type LinhaAtendimento = {
    telefone_cliente: string | null;
    operator_email: string;
    hora: string | null;
    gestor_id: string;
  };
  let atendimentos: LinhaAtendimento[];
  try {
    atendimentos = await lerAtendimentosTma<LinhaAtendimento>(
      (supabase) =>
        supabase
          .from("d1_tma_atendimentos")
          .select("telefone_cliente, operator_email, hora, gestor_id")
          .not("telefone_cliente", "is", null),
      dataRef,
      "get-rechamada-polo-tma",
    );
  } catch (err) {
    console.error("[get-rechamada-polo-tma] erro:", err instanceof Error ? err.message : err);
    return null;
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

    // Atendimento sem horário vai pro FIM: antes "" ordenava antes de
    // qualquer hora e virava o "1º atendimento" do telefone.
    const doTelefone = [...doTelefoneBruto].sort((a, b) => {
      if (a.hora === null || b.hora === null) return a.hora === b.hora ? 0 : a.hora === null ? 1 : -1;
      return a.hora.localeCompare(b.hora);
    });
    const primeiro = doTelefone[0];
    // 2º atendimento = a primeira vez que o cliente voltou a ligar (é a
    // rechamada em si). Antes mostrava o ÚLTIMO, que com 3+ ligações não era
    // o 2º, embora a coluna se chamasse "2º Atendimento".
    const segundo = doTelefone[1];

    // Só entra se o PRIMEIRO atendimento do dia foi do gestor logado —
    // critério confirmado (não importa quem atendeu depois).
    if (primeiro.gestor_id !== gestorId) continue;

    lista.push({
      telefoneCliente: telefone,
      emailLocalPrimeiro: primeiro.operator_email.split("@")[0] ?? primeiro.operator_email,
      horaPrimeiro: horaCurta(primeiro.hora),
      emailLocalSegundo: segundo.operator_email.split("@")[0] ?? segundo.operator_email,
      horaSegundo: horaCurta(segundo.hora),
    });
  }

  lista.sort((a, b) => a.horaPrimeiro.localeCompare(b.horaPrimeiro));
  return lista;
}
