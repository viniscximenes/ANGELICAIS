import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

import type { OperatorWithCount } from "@/lib/diario/types";

interface Props {
  operators: OperatorWithCount[];
  currentMonth: string;
}

export function DiarioOperatorsList({ operators, currentMonth }: Props) {
  if (operators.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">
          Nenhum operador encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {operators.map((op) => (
        <Link
          key={op.id}
          href={`/registros/diario/${encodeURIComponent(op.emailCorporativo)}?month=${currentMonth}`}
          className="elevation-1 hover:elevation-2 flex items-center justify-between gap-3 rounded-lg p-4 transition-all"
        >
          <div className="min-w-0 flex-1">
            <p className="ds-body truncate font-medium">{op.fullName}</p>
            <p className="ds-mono-sm text-muted-foreground mt-0.5">
              {op.emailCorporativo} ·{" "}
              <span className="opacity-70">{op.role}</span>
            </p>
            {op.registrosCount > 0 ? (
              <p className="ds-mono-sm text-muted-foreground mt-1.5">
                {op.registrosCount} registro
                {op.registrosCount !== 1 ? "s" : ""}
                {" · "}
                {op.countByCaso.pausa_autorizada > 0 &&
                  `${op.countByCaso.pausa_autorizada} Pausa `}
                {op.countByCaso.fora_jornada > 0 &&
                  `${op.countByCaso.fora_jornada} Fora `}
                {op.countByCaso.geral > 0 && `${op.countByCaso.geral} Geral `}
                {op.countByCaso.outros > 0 &&
                  `${op.countByCaso.outros} Outros `}
              </p>
            ) : (
              <p className="ds-mono-sm text-muted-foreground mt-1.5 italic">
                Sem registros neste mês
              </p>
            )}
          </div>
          <IconChevronRight
            size={18}
            className="text-muted-foreground shrink-0"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
