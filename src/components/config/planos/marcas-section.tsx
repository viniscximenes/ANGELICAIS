import type { Marca } from "@/lib/config/planos/types";

import { MarcasTable } from "./marcas-table";
import { NewMarcaButton } from "./new-marca-button";

interface Props {
  marcas: Marca[];
}

export function MarcasSection({ marcas }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
          Marcas
        </h2>
        <NewMarcaButton />
      </div>

      <MarcasTable marcas={marcas} />
    </section>
  );
}
