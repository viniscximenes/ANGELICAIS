"use client";

import { useState } from "react";

import type { EvolucaoSnapshot } from "@/lib/d1/evolucao/types";
import { getTabelaPorSupervisor } from "@/lib/d1/supervisor";
import type {
  ConsolidadoData,
  OperadorConsolidado,
  ResumoEquipe,
} from "@/lib/google/d1";

import { EquipeSection } from "../equipe-section";
import { OperadorSearch } from "./operador-search";
import { SupervisorSelector } from "./supervisor-selector";

interface RelatorioSupervisorViewProps {
  consolidado: ConsolidadoData;
  supervisores: string[];
  snapshots: EvolucaoSnapshot[];
  showUpload: boolean;
}

export function RelatorioSupervisorView({
  consolidado,
  supervisores,
  snapshots,
  showUpload,
}: RelatorioSupervisorViewProps) {
  const [supervisorSelecionado, setSupervisorSelecionado] = useState(
    supervisores[0] ?? "",
  );
  // Busca de operador em toda a empresa (independe do supervisor).
  const [termoBusca, setTermoBusca] = useState("");
  const [operadorBuscado, setOperadorBuscado] =
    useState<OperadorConsolidado | null>(null);

  // Planilha sem nenhum supervisor → estado neutro.
  if (supervisores.length === 0) {
    return (
      <div
        className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
        style={{ border: "1px solid var(--border)" }}
      >
        Sem dados de equipe disponíveis.
      </div>
    );
  }

  // Trocar de supervisor limpa a busca e volta ao modo filtro.
  function handleSupervisorChange(sup: string) {
    setSupervisorSelecionado(sup);
    setTermoBusca("");
    setOperadorBuscado(null);
  }

  // Digitar invalida a seleção fixada (volta a buscar até escolher de novo).
  function handleTermoChange(termo: string) {
    setTermoBusca(termo);
    if (operadorBuscado !== null) setOperadorBuscado(null);
  }

  function handleSelectOperador(op: OperadorConsolidado) {
    setOperadorBuscado(op);
    setTermoBusca(op.email.split("@")[0] || op.email);
  }

  function handleClearBusca() {
    setTermoBusca("");
    setOperadorBuscado(null);
  }

  // MODO BUSCA: tabela mostra só o operador buscado; MODO FILTRO: equipe do
  // supervisor selecionado (comportamento original).
  const modoBusca = operadorBuscado !== null;

  const tabela = getTabelaPorSupervisor(consolidado, supervisorSelecionado);

  const operadoresExibidos = operadorBuscado
    ? [operadorBuscado]
    : tabela.operadores;

  const equipe: ResumoEquipe = operadorBuscado
    ? {
        retidos: operadorBuscado.retidos,
        cancelados: operadorBuscado.cancelados,
        pedidos: operadorBuscado.pedidos,
        txRetencao: operadorBuscado.txRetencao,
        horaReport: consolidado.horaReport,
      }
    : {
        retidos: tabela.totais?.retidos ?? 0,
        cancelados: tabela.totais?.cancelados ?? 0,
        pedidos: tabela.totais?.pedidos ?? 0,
        txRetencao: tabela.totais?.txRetencao ?? null,
        horaReport: consolidado.horaReport,
      };

  return (
    <div className="space-y-6">
      {/* Filtro de supervisor — atenuado durante a busca, mas ainda
          interativo (trocar o supervisor limpa a busca). */}
      <div
        style={{ opacity: modoBusca ? 0.5 : 1, transition: "opacity 0.2s ease" }}
      >
        <SupervisorSelector
          supervisores={supervisores}
          value={supervisorSelecionado}
          onChange={handleSupervisorChange}
        />
      </div>

      <OperadorSearch
        operadores={consolidado.operadores}
        termo={termoBusca}
        onTermoChange={handleTermoChange}
        operadorSelecionado={operadorBuscado}
        onSelect={handleSelectOperador}
        onClear={handleClearBusca}
      />

      {operadoresExibidos.length === 0 ? (
        <div
          className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
          style={{ border: "1px solid var(--border)" }}
        >
          Nenhum operador encontrado para este supervisor.
        </div>
      ) : (
        <EquipeSection
          operadores={operadoresExibidos}
          equipe={equipe}
          snapshots={snapshots}
          showUpload={showUpload}
          supervisor={
            operadorBuscado ? operadorBuscado.supervisor : supervisorSelecionado
          }
          hideTotais={modoBusca}
        />
      )}
    </div>
  );
}
