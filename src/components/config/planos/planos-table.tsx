import type { PlanoWithMarca } from "@/lib/config/planos/types";

import { PlanoRow } from "./plano-row";

interface Props {
  planos: PlanoWithMarca[];
}

export function PlanosTable({ planos }: Props) {
  if (planos.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="ds-mono-sm text-muted-foreground">
          Esta marca ainda não tem planos. Adicione o primeiro.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-3 border-b px-4 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-1">Ordem</div>
        <div className="col-span-5">Nome</div>
        <div className="col-span-2">Valor</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-3 text-right">Ações</div>
      </div>

      {planos.map((p, idx) => (
        <PlanoRow
          key={p.id}
          plano={p}
          isFirst={idx === 0}
          isLast={idx === planos.length - 1}
        />
      ))}
    </>
  );
}
