"use client";

import { useState } from "react";
import type { AlertaItem } from "@/lib/retencao/get-alertas";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconShield,
  IconUserMinus,
  IconTrendingDown,
  IconBookmarkMinus,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

interface PainelAlertasProps {
  alertas: AlertaItem[];
}

export function PainelAlertas({ alertas }: PainelAlertasProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getIcon = (alerta: AlertaItem) => {
    if (alerta.severidade === "success") {
      return <IconCircleCheck size={18} className="text-success shrink-0" />;
    }
    switch (alerta.tipo) {
      case "operador":
        return <IconUserMinus size={18} className="text-danger" />;
      case "motivo":
        return <IconBookmarkMinus size={18} className="text-warning" />;
      case "segmento":
        return <IconShield size={18} className="text-warning" />;
      case "queda":
        return <IconTrendingDown size={18} className="text-danger" />;
      default:
        return <IconAlertTriangle size={18} className="text-warning" />;
    }
  };

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
            <IconShield size={20} className="text-foreground" />
            Alertas Do Turno
          </h3>
          <p className="ds-small text-muted-foreground mt-1">
            Notificações em tempo real sobre desvios operacionais importantes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alertas.length > 0 && (
            <span className="text-xs text-muted-foreground font-mono font-medium lowercase">
              {alertas.length} avisos
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {alertas.length === 0 ? (
            <div className="flex items-center gap-3 border border-success/30 bg-success/5 rounded-lg p-4 animate-in fade-in duration-200">
              <IconCircleCheck size={20} className="text-success shrink-0" />
              <p className="ds-small text-muted-foreground text-xs">
                Nenhuma anomalia crítica foi identificada nos dados analíticos da equipe. Operação estável.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-200">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={[
                    "flex items-start gap-3 border rounded-lg p-3 transition-colors text-xs",
                    alerta.severidade === "critical"
                      ? "border-danger/30 bg-danger/5 hover:bg-danger/10"
                      : alerta.severidade === "success"
                      ? "border-success/30 bg-success/5 hover:bg-success/10"
                      : "border-warning/30 bg-warning/5 hover:bg-warning/10",
                  ].join(" ")}
                >
                  <div className="shrink-0 mt-0.5">{getIcon(alerta)}</div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{alerta.titulo}</p>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {alerta.descricao}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
