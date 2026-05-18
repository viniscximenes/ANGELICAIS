import { formatSecondsAsHHMMSS } from "@/lib/diario/time-format";
import type { DiarioRegistro } from "@/lib/diario/types";
import type { OperatorItem } from "@/lib/monitorias/get-all-operators-no-gestor";

import { CasoBadge } from "./caso-badge";
import { CopyDescriptionButton } from "./copy-description-button";
import { DeleteDiarioButton } from "./delete-diario-button";
import { EditDiarioButton } from "./edit-diario-button";

function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

interface Props {
  registro: DiarioRegistro;
  canEdit: boolean;
  operators: OperatorItem[];
}

export function DiarioRecordCard({ registro, canEdit, operators }: Props) {
  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <CasoBadge caso={registro.caso} />
          <span className="ds-mono-sm text-muted-foreground">
            {formatDateBR(registro.dataOcorrido)}
          </span>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <EditDiarioButton registro={registro} operators={operators} />
            <DeleteDiarioButton id={registro.id} />
          </div>
        )}
      </div>

      {registro.caso === "fora_jornada" && (
        <div className="ds-mono-sm space-y-0.5">
          <div className="flex gap-2">
            <span className="text-muted-foreground">Tempo logado:</span>
            <span>{formatSecondsAsHHMMSS(registro.tempoLogadoSegundos)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">A justificar:</span>
            <span style={{ color: "var(--danger)" }}>
              {formatSecondsAsHHMMSS(registro.tempoAJustificarSegundos)}
            </span>
          </div>
        </div>
      )}

      {(registro.caso === "pausa_autorizada" ||
        ((registro.caso === "geral" || registro.caso === "outros") &&
          registro.tempoSegundos !== null)) && (
        <div className="ds-mono-sm">
          <span className="text-muted-foreground">Tempo: </span>
          <span>{formatSecondsAsHHMMSS(registro.tempoSegundos)}</span>
        </div>
      )}

      {registro.glpi && (
        <div className="ds-mono-sm">
          <span className="text-muted-foreground">GLPI: </span>
          <span>{registro.glpi}</span>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <p className="ds-mono-sm text-muted-foreground tracking-wider">
            DESCRIÇÃO
          </p>
          <CopyDescriptionButton text={registro.descricao} />
        </div>
        <div
          className="elevation-2 ds-body rounded-md p-3"
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            border: "1px solid var(--border)",
          }}
        >
          {registro.descricao}
        </div>
      </div>
    </div>
  );
}
