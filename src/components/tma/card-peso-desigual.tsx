import { IconScale } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import { resolverNomeExibicao, type NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import type { OperadorPesoDesigual } from "@/lib/tma/calcular-peso-desigual";

interface CardPesoDesigualProps {
  operadores: OperadorPesoDesigual[];
  nomeFantasia: NomeFantasiaSerial;
}

/**
 * Lista de operadores concentrando >= 80% dos atendimentos do dia num único
 * tema (piso mínimo de 5 atendimentos) — nome respeitando nome fantasia,
 * MESMO padrão do resto da TMA (NÃO é a exceção do tooltip do gráfico de
 * evolução, que usa e-mail literal por decisão própria e separada).
 */
export function CardPesoDesigual({ operadores, nomeFantasia }: CardPesoDesigualProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconScale size={20} className="text-foreground" />
          Peso Desigual
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Operadores concentrando 80%+ dos atendimentos num único tema hoje.
        </p>
      </div>

      <StyledCard className="p-4 space-y-2.5" withGradient corners="all">
        {operadores.length === 0 ? (
          <p className="ds-small text-muted-foreground text-center py-4 italic">
            Nenhum operador com peso desigual hoje.
          </p>
        ) : (
          operadores.map((op) => {
            const nomeExibicao = resolverNomeExibicao(op.operatorEmail, nomeFantasia);
            return (
              <div key={op.operatorEmail} className="flex items-center justify-between gap-3 border-b border-border/20 pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="ds-body text-xs font-semibold text-foreground truncate">{nomeExibicao}</p>
                  <p className="ds-small text-muted-foreground text-[11px] mt-0.5">
                    {op.temaDominante} · {op.qtdAtendimentos} atendimentos
                  </p>
                </div>
                <span className="ds-mono-sm font-semibold text-danger text-xs shrink-0">
                  {op.percentual.toFixed(1)}%
                </span>
              </div>
            );
          })
        )}
      </StyledCard>
    </div>
  );
}
