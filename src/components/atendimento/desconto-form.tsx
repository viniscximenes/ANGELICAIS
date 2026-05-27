"use client";

import type { Marca, PlanoWithMarca } from "@/lib/config/planos/types";

interface Props {
  marcas: Marca[];
  planos: PlanoWithMarca[];
  marcaId: string;
  planoId: string;
  tempoMeses: number | "";
  onMarcaChange: (id: string) => void;
  onPlanoChange: (id: string) => void;
  onTempoChange: (m: number | "") => void;
}

export function DescontoForm({
  marcas,
  planos,
  marcaId,
  planoId,
  tempoMeses,
  onMarcaChange,
  onPlanoChange,
  onTempoChange,
}: Props) {
  const planosDaMarca = planos.filter((p) => p.marcaId === marcaId);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label className="ds-mono-sm text-muted-foreground mb-1 block">
          Marca
        </label>
        <select
          value={marcaId}
          onChange={(e) => onMarcaChange(e.target.value)}
          className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
          style={{
            border: "1px solid var(--border)",
            colorScheme: "dark",
          }}
        >
          <option value="">Selecionar...</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ds-mono-sm text-muted-foreground mb-1 block">
          Plano
        </label>
        <select
          value={planoId}
          onChange={(e) => onPlanoChange(e.target.value)}
          disabled={!marcaId}
          className="elevation-2 ds-mono w-full rounded-md px-3 py-2 disabled:opacity-50"
          style={{
            border: "1px solid var(--border)",
            colorScheme: "dark",
          }}
        >
          <option value="">
            {marcaId ? "Selecionar..." : "Escolha a marca primeiro"}
          </option>
          {planosDaMarca.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — R$ {p.valor.toFixed(2).replace(".", ",")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="ds-mono-sm text-muted-foreground mb-1 block">
          Tempo (meses)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={tempoMeses}
          onChange={(e) =>
            onTempoChange(
              e.target.value === ""
                ? ""
                : Math.max(0, parseInt(e.target.value, 10)),
            )
          }
          placeholder="Ex: 8"
          className="elevation-2 ds-mono w-full rounded-md px-3 py-2"
          style={{ border: "1px solid var(--border)" }}
        />
      </div>
    </div>
  );
}
