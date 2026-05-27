"use client";

import type { PerformanceOperador } from "@/lib/atendimento/types";

import { PerformanceCard } from "./performance-card";
import { ProtocoloCard } from "./protocolo-card";
import { SharedStateProvider } from "./shared-state";

interface Props {
  performance: PerformanceOperador | null;
}

export function AtendimentoLayout({ performance }: Props) {
  return (
    <SharedStateProvider>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <ProtocoloCard />
        </div>

        <div>
          <PerformanceCard performance={performance} />
        </div>
      </div>
    </SharedStateProvider>
  );
}
