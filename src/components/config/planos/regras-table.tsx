import type { RegraDesconto } from "@/lib/config/planos/types";

import { RegraRow } from "./regra-row";

interface Props {
  regras: RegraDesconto[];
}

export function RegrasTable({ regras }: Props) {
  if (regras.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhuma regra cadastrada para esta categoria. Atendimento não mostrará
          ofertas até que você cadastre.
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
        <div className="col-span-4">Tempo de cliente</div>
        <div className="col-span-3">Desconto máx</div>
        <div className="col-span-2">Duração</div>
        <div className="col-span-3 text-right">Ações</div>
      </div>

      {regras.map((r) => (
        <RegraRow key={r.id} regra={r} />
      ))}
    </div>
  );
}
