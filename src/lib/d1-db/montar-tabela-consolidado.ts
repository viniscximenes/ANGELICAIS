import {
  resolverNomeExibicao,
  type NomeFantasiaSerial,
} from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { aplicarRvDiarioNaEquipe } from "@/lib/rv/calculate-rv-diario";
import type { PerUnitFaixa } from "@/lib/rv/types";
import type { GestorConsolidado, GestorOperadorLinha, OperadorConsolidado, ResumoEquipe } from "./types";

/**
 * Linhas do getGestorConsolidado → formato da EquipeTable (operadores com
 * nome de exibição e RV) + linha "EQUIPE". Único lugar desta conversão: a
 * carga inicial (page.tsx) e o polling (refreshConsolidadoAction) usavam
 * cópias paralelas do mesmo mapeamento.
 *
 * Nome fantasia (olho fechado) é PRIVACIDADE VISUAL, não controle de acesso.
 * Objetivo: evitar exposição dos nomes reais em compartilhamento de tela /
 * apresentações. O gestor já tem autorização para ver os dados da própria
 * equipe (o servidor só entrega os operadores da equipe dele), então
 * `emailOriginal` chegar ao navegador não é vazamento: é dado que o próprio
 * usuário autenticado pode acessar. Não tratar como anonimização nem como
 * achado de segurança em auditorias.
 */
export function montarTabelaConsolidado({
  linhas,
  consolidado,
  reportHora,
  nomeFantasia,
  rvFaixas,
}: {
  linhas: GestorOperadorLinha[];
  consolidado: GestorConsolidado;
  reportHora: string | null;
  nomeFantasia: NomeFantasiaSerial;
  /** null = erro ao ler as regras de RV (RV aparece como "—"). */
  rvFaixas: PerUnitFaixa[] | null;
}): { operadores: OperadorConsolidado[]; equipe: ResumoEquipe } {
  const operadoresSemRv: OperadorConsolidado[] = linhas.map((op) => ({
    email: resolverNomeExibicao(op.nome.trim().toLowerCase(), nomeFantasia),
    emailOriginal: op.nome.trim().toLowerCase(),
    supervisor: op.gestora,
    retidos: op.retidos,
    cancelados: op.cancelados,
    pedidos: op.pedidos,
    txRetencao: op.txRetencao,
  }));

  const { operadores, rvDiarioEquipe } = aplicarRvDiarioNaEquipe(operadoresSemRv, rvFaixas);

  return {
    operadores,
    equipe: {
      retidos: consolidado.retidos,
      cancelados: consolidado.cancelados,
      pedidos: consolidado.pedidos,
      txRetencao: consolidado.txRetencao,
      horaReport: reportHora ?? "—",
      rvDiario: rvDiarioEquipe,
    },
  };
}
