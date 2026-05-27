import type { Marca } from "@/lib/config/planos/types";

import { MarcaRow } from "./marca-row";

interface Props {
  marcas: Marca[];
}

export function MarcasTable({ marcas }: Props) {
  if (marcas.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhuma marca cadastrada. Adicione a primeira marca para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="elevation-1 overflow-hidden rounded-xl">
      <div
        className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-5">Nome</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Planos</div>
        <div className="col-span-3 text-right">Ações</div>
      </div>

      {marcas.map((m) => (
        <MarcaRow key={m.id} marca={m} />
      ))}
    </div>
  );
}
