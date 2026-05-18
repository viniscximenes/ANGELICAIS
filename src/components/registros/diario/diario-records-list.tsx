import type { DiarioRegistroWithName } from "@/lib/diario/types";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";

import { DiarioRecordCard } from "./diario-record-card";

interface Props {
  registros: DiarioRegistroWithName[];
  canEdit: boolean;
  operators: OperatorItem[];
}

export function DiarioRecordsList({ registros, canEdit, operators }: Props) {
  if (registros.length === 0) {
    return (
      <div className="elevation-1 rounded-xl p-8 text-center">
        <p className="ds-body text-muted-foreground">Sem registros neste mês</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {registros.map((r) => (
        <DiarioRecordCard
          key={r.id}
          registro={r}
          canEdit={canEdit}
          operators={operators}
        />
      ))}
    </div>
  );
}
