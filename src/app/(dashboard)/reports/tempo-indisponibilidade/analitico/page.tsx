import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnaliticoTempoIndispSection } from "@/components/dashboard/tempo-indisponibilidade/analitico-tempo-indisp-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getPausasProgramadas } from "@/lib/bases/pausas-programadas/actions/get-pausas-programadas";
import { getGestorIndisponibilidade } from "@/lib/d1-db/get-gestor-indisponibilidade";
import { getGestorTempoLogado } from "@/lib/d1-db/get-gestor-tempo-logado";
import { getRosterOperadoresGestor } from "@/lib/d1-db/get-roster-gestor";
import { getConfigAderencia } from "@/lib/gestor/config-aderencia/get-config-aderencia";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";

export const metadata: Metadata = {
  title: "Reports - Tempo Logado & Indisponibilidade - Analítico",
};

export default async function AnaliticoTempoIndisponibilidadePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Apenas role GESTOR acessa este painel.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const gestora = user.profile.fullName
    ? formatNomeProprio(user.profile.fullName)
    : "Equipe";

  // Fonte de dados: d1_tempo_logado + d1_indisponibilidade (reais do dia) +
  // base_pausas_programadas (horários programados, pra aderência).
  const [dataTempoLogado, dataIndisponibilidade, roster, pausasProgramadas, configAderencia] =
    await Promise.all([
      getGestorTempoLogado(user.profile.id),
      getGestorIndisponibilidade(user.profile.id),
      getRosterOperadoresGestor(user.profile.id),
      getPausasProgramadas(),
      getConfigAderencia(user.profile.id),
    ]);

  return (
    <AnaliticoTempoIndispSection
      gestora={gestora}
      operadoresTempoLogadoIniciais={dataTempoLogado.operadores}
      operadoresIndisponibilidadeIniciais={dataIndisponibilidade.operadores}
      horaReportInicial={dataTempoLogado.horaReport ?? null}
      emailsEquipe={roster}
      pausasProgramadas={pausasProgramadas}
      toleranciaMin={configAderencia.toleranciaMin}
    />
  );
}
