import { getPorOperador } from "./get-por-operador";
import { getPorTema } from "./get-por-tema";
import { getQuedas } from "./get-quedas";
import { getEvolucaoHora } from "./get-evolucao-hora";
import { getVisaoGeral } from "./get-visao-geral";
import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarFiltroEscopo } from "./escopo";

export type AlertaSeveridade = "critical" | "warning" | "success";

export type AlertaItem = {
  id: string;
  tipo: "operador" | "motivo" | "segmento" | "queda";
  titulo: string;
  descricao: string;
  severidade: AlertaSeveridade;
};

// Limiares centrais de configuração
export const ALERTA_MOTIVO_DIFF_CORTE = 0.15; // 15% abaixo da média do turno
export const ALERTA_VOLUME_MINIMO = 5;

/**
 * Analisa os dados operacionais do turno e gera alertas preventivos de desvio de padrão.
 */
export async function getAlertas(
  escopo: "equipe" | "empresa",
  emailsEquipe: string[],
  periodo: { horaInicio: number; horaFim: number } | null,
  turno: "manha" | "tarde",
  metaTxRetencao: number, // Meta na escala 0-1 (ex: 0.60)
): Promise<AlertaItem[]> {
  const [operadores, temas, visaoGeral, evolucaoHora] = await Promise.all([
    getPorOperador(escopo, emailsEquipe, periodo),
    getPorTema(escopo, emailsEquipe, periodo),
    getVisaoGeral(escopo, emailsEquipe, periodo),
    getEvolucaoHora(escopo, emailsEquipe, turno, periodo),
  ]);

  const alertas: AlertaItem[] = [];

  const mediaGeralTx = visaoGeral.tx !== null ? visaoGeral.tx : 0;

  // 1. Alertas de Operadores (Taxa de retenção abaixo da meta) - Apenas se escopo for "equipe"
  if (escopo === "equipe") {
    for (const op of operadores) {
      if (op.total >= ALERTA_VOLUME_MINIMO && op.tx !== null && op.tx < metaTxRetencao) {
        const diffMeta = Math.round((metaTxRetencao - op.tx) * 100);
        const loginPrefix = op.login.includes("@") ? op.login.split("@")[0] : op.login;
        alertas.push({
          id: `op-${op.login}`,
          tipo: "operador",
          titulo: `Operador abaixo da meta`,
          descricao: `Operador ${loginPrefix} esta com a taxa de ${(op.tx * 100).toFixed(0)}% (${diffMeta}% a menos da meta do polo) com ${op.total} pedidos.`,
          severidade: "critical",
        });
      }
    }
  }

  // 2. Alertas de Motivos (Taxa de retenção 15 p.p. abaixo da média geral)
  for (const t of temas) {
    if (t.total >= ALERTA_VOLUME_MINIMO && t.tx !== null && t.tx < (mediaGeralTx - ALERTA_MOTIVO_DIFF_CORTE)) {
      const diffMedia = Math.round((mediaGeralTx - t.tx) * 100);
      alertas.push({
        id: `mot-${t.motivo}`,
        tipo: "motivo",
        titulo: `Queda na taxa - ${t.motivo}`,
        descricao: `O tema ${t.motivo} registrou taxa de retenção de ${(t.tx * 100).toFixed(0)}%, representando ${diffMedia}% abaixo da taxa da equipe (${(mediaGeralTx * 100).toFixed(0)}%).`,
        severidade: "warning",
      });
    }
  }

  // 4. Alertas de Quedas de Turno
  let txAcumuladaManha: number | null = null;
  if (turno === "tarde") {
    try {
      const vgManha = await getVisaoGeral(escopo, emailsEquipe, { horaInicio: 8, horaFim: 13 });
      txAcumuladaManha = vgManha.tx;
    } catch (e) {
      console.error("[getAlertas] erro ao obter média da manhã para queda 14h:", e);
    }
  }
  const quedas = getQuedas(evolucaoHora, txAcumuladaManha);
  for (const q of quedas) {
    if (periodo && q.hora > periodo.horaFim) {
      continue;
    }
    const quedaFormatted = String(q.quedaPontos).replace(".", ",");
    const txAnteriorFormatted = String((q.txAnterior * 100).toFixed(1)).replace(".", ",");
    const isTransitionFromMorning = q.horaAnterior === 13 && q.labelAnterior === "Acumulado Manhã";
    const refText = isTransitionFromMorning ? "ao acumulado do turno da manhã" : "à hora anterior";
    const pastText = isTransitionFromMorning ? "O turno da manhã fechou com" : "Na hora passada estava com";

    alertas.push({
      id: `queda-${q.hora}`,
      tipo: "queda",
      titulo: `Queda de taxa - ${q.label}`,
      descricao: `A taxa caiu ${quedaFormatted}% em relação ${refText}, registrando ${(q.txAtual * 100).toFixed(0)}% entre ${q.label} e ${String(q.hora).padStart(2, "0")}:59 (${pastText} ${txAnteriorFormatted}%)`,
      severidade: "critical",
    });
  }

  // 5. Alertas de Quedas em Temas de Retenção (ex: caiu de 80% para 70%)
  const horasTurno = turno === "manha" ? [8, 9, 10, 11, 12, 13] : [14, 15, 16, 17, 18, 19];
  const supabase = createAdminClient();
  let queryAtendimentos = supabase
    .from("retencao_atendimentos")
    .select("motivo, hora, foi_cancelamento");
  queryAtendimentos = aplicarFiltroEscopo(queryAtendimentos, { escopo, emailsEquipe, periodo: null });
  queryAtendimentos = queryAtendimentos.in("hora", horasTurno);

  const { data: rawAtendimentos } = await queryAtendimentos;
  if (rawAtendimentos && rawAtendimentos.length > 0) {
    const themeHourlyStats: Record<string, Record<number, { total: number; retidos: number }>> = {};
    for (const row of rawAtendimentos) {
      let mot = (row.motivo || "Sem Motivo").trim();
      if (mot === "Mud. Endereço Inviabilidade" || mot === "Mudança de Provedor - Preço") {
        mot = "Mud. Endereço";
      }
      const h = row.hora;
      const isRetained = !row.foi_cancelamento;

      if (!themeHourlyStats[mot]) themeHourlyStats[mot] = {};
      if (!themeHourlyStats[mot][h]) themeHourlyStats[mot][h] = { total: 0, retidos: 0 };
      themeHourlyStats[mot][h].total++;
      if (isRetained) themeHourlyStats[mot][h].retidos++;
    }

    for (const [motivo, hoursMap] of Object.entries(themeHourlyStats)) {
      for (let i = 1; i < horasTurno.length; i++) {
        const hAnterior = horasTurno[i - 1];
        const hAtual = horasTurno[i];

        if (periodo && hAtual > periodo.horaFim) {
          continue;
        }

        const statsAnterior = hoursMap[hAnterior];
        const statsAtual = hoursMap[hAtual];

        if (statsAnterior && statsAnterior.total >= 3 && statsAtual && statsAtual.total >= 3) {
          const txAnterior = statsAnterior.retidos / statsAnterior.total;
          const txAtual = statsAtual.retidos / statsAtual.total;

          if (txAtual < txAnterior) {
            const diffPt = Math.round((txAnterior - txAtual) * 100);
            if (diffPt >= 5) {
              alertas.push({
                id: `queda-tema-${motivo}-${hAnterior}-${hAtual}`,
                tipo: "motivo",
                titulo: `Queda no tema: ${motivo}`,
                descricao: `A taxa do tema "${motivo}" caiu de ${(txAnterior * 100).toFixed(0)}% para ${(txAtual * 100).toFixed(0)}% (-${diffPt} p.p.) entre as ${String(hAnterior).padStart(2, "0")}h e ${String(hAtual).padStart(2, "0")}h.`,
                severidade: "warning",
              });
            }
          }
        }
      }
    }
  }

  // 6. Alertas de Aumentos de Taxa de Retenção (ex: subiu de H-1 para H) - Nível de Sucesso (Green Cards)
  const aumentos: {
    horaAnterior: number;
    hora: number;
    labelAnterior: string;
    label: string;
    txAnterior: number;
    txAtual: number;
    aumentoPontos: number;
  }[] = [];
  const LIMIAR_AUMENTO = 2.0;

  for (let i = 1; i < evolucaoHora.length; i++) {
    const prev = evolucaoHora[i - 1];
    const curr = evolucaoHora[i];

    if (prev.tx !== null && curr.tx !== null) {
      const diff = curr.tx - prev.tx;
      const aumentoPontos = diff * 100;

      if (aumentoPontos >= LIMIAR_AUMENTO) {
        aumentos.push({
          horaAnterior: prev.hora,
          hora: curr.hora,
          labelAnterior: prev.label,
          label: curr.label,
          txAnterior: prev.tx,
          txAtual: curr.tx,
          aumentoPontos: parseFloat(aumentoPontos.toFixed(1)),
        });
      }
    }
  }

  aumentos.sort((a, b) => b.aumentoPontos - a.aumentoPontos);

  for (const a of aumentos) {
    if (periodo && a.hora > periodo.horaFim) {
      continue;
    }
    const aumentoFormatted = String(a.aumentoPontos).replace(".", ",");
    const txAnteriorFormatted = String((a.txAnterior * 100).toFixed(1)).replace(".", ",");
    alertas.push({
      id: `aumento-${a.hora}`,
      tipo: "queda",
      titulo: `Aumento de taxa - ${a.label}`,
      descricao: `A taxa subiu ${aumentoFormatted}% em relação à hora anterior, registrando ${(a.txAtual * 100).toFixed(0)}% entre ${a.label} e ${String(a.hora).padStart(2, "0")}:59 (Na hora passada estava com ${txAnteriorFormatted}%)`,
      severidade: "success",
    });
  }

  // Ordena pela prioridade: 1º Operador abaixo da meta, 2º Queda por hora (queda), 3º Queda por tema (motivo)
  // Mas os cards de "success" (aumento de taxa) devem ir sempre por último (no final de tudo)
  const orderMap: Record<string, number> = {
    operador: 0,
    queda: 1,
    motivo: 2,
  };

  return alertas.sort((a, b) => {
    if (a.severidade === "success" && b.severidade !== "success") return 1;
    if (a.severidade !== "success" && b.severidade === "success") return -1;

    const priorityA = orderMap[a.tipo] ?? 99;
    const priorityB = orderMap[b.tipo] ?? 99;
    return priorityA - priorityB;
  });
}
