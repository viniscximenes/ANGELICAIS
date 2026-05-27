"use client";

import { useEffect, useState } from "react";

import { computeOfertasPermitidas } from "@/lib/atendimento/compute-ofertas-permitidas";
import type {
  Marca,
  PlanoWithMarca,
  RegraDesconto,
} from "@/lib/config/planos/types";

import { DescontoForm } from "./desconto-form";
import { DescontoOfertasList } from "./desconto-ofertas-list";
import { useSharedState } from "./shared-state";

interface Props {
  marcas: Marca[];
  planos: PlanoWithMarca[];
  regras: RegraDesconto[];
}

export function DescontoCard({ marcas, planos, regras }: Props) {
  const { resetVersion } = useSharedState();

  const [marcaId, setMarcaId] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [tempoMeses, setTempoMeses] = useState<number | "">("");

  useEffect(() => {
    if (resetVersion > 0) {
      setMarcaId("");
      setPlanoId("");
      setTempoMeses("");
    }
  }, [resetVersion]);

  useEffect(() => {
    setPlanoId("");
  }, [marcaId]);

  const planoAtual = planos.find((p) => p.id === planoId) ?? null;

  const ofertas =
    planoAtual && typeof tempoMeses === "number"
      ? computeOfertasPermitidas(tempoMeses, regras)
      : [];

  return (
    <div className="elevation-1 space-y-4 rounded-xl p-5">
      <div>
        <h2 className="ds-h2" style={{ fontSize: "1.125rem" }}>
          Calculadora de Desconto
        </h2>
        <p className="ds-mono-sm text-muted-foreground">
          Consulta visual. Selecione marca, plano e tempo do cliente para ver
          as ofertas permitidas.
        </p>
      </div>

      <DescontoForm
        marcas={marcas}
        planos={planos}
        marcaId={marcaId}
        planoId={planoId}
        tempoMeses={tempoMeses}
        onMarcaChange={setMarcaId}
        onPlanoChange={setPlanoId}
        onTempoChange={setTempoMeses}
      />

      {planoAtual && typeof tempoMeses === "number" && (
        <DescontoOfertasList plano={planoAtual} ofertas={ofertas} />
      )}
    </div>
  );
}
