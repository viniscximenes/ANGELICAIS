import type { Marca, PlanoWithMarca } from "@/lib/config/planos/types";

import { PlanosMarcaGroup } from "./planos-marca-group";

interface Props {
  marcas: Marca[];
  planos: PlanoWithMarca[];
}

export function PlanosSection({ marcas, planos }: Props) {
  const marcasAtivas = marcas.filter((m) => m.isActive);

  return (
    <section className="space-y-4">
      <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
        Planos
      </h2>

      {marcasAtivas.length === 0 ? (
        <div className="elevation-1 rounded-xl p-8 text-center">
          <p className="ds-body text-muted-foreground">
            Cadastre uma marca primeiro para adicionar planos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {marcasAtivas.map((marca) => {
            const planosDaMarca = planos.filter((p) => p.marcaId === marca.id);
            return (
              <PlanosMarcaGroup
                key={marca.id}
                marca={marca}
                planos={planosDaMarca}
                todasMarcas={marcas}
                todosPlanos={planos}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
