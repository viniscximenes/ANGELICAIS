import { GraficoVazio } from "@/components/dashboard/retencao/analitico-skeleton";
import {
  CARD_CLASS,
  HEADER_CELL_CLASS,
  HEADER_ROW_CLASS,
  LINHA_CLASS,
  LINHA_SEPARADOR_CLASS,
  NOME_CELL_CLASS,
  ROLAGEM_CLASS,
  VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-analitico";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import type { OperadorPesoDesigual } from "@/lib/tma/calcular-peso-desigual";
import { cn } from "@/lib/utils";

// Operador : Tema dominante : Atendimentos : Concentração.
const GRID_COLS = "minmax(184px, 1.4fr) minmax(150px, 1.2fr) minmax(130px, 1fr) minmax(130px, 1fr)";

interface CardPesoDesigualProps {
  operadores: OperadorPesoDesigual[];
}

/**
 * "Peso desigual" — operadores concentrando >= 60% dos atendimentos do dia
 * num único tema (piso mínimo de 5 atendimentos). Nome sempre REAL (sem
 * nome fantasia), mesma regra das outras tabelas do Analítico.
 */
export function CardPesoDesigual({ operadores }: CardPesoDesigualProps) {
  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Peso desigual</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento dos operadores que concentram 60% ou mais dos atendimentos do dia num único tema.
        </p>
      </div>

      {operadores.length === 0 ? (
        <GraficoVazio
          titulo="Nenhum peso desigual hoje"
          descricao="Nenhum operador concentrou 60% ou mais dos atendimentos num único tema."
        />
      ) : (
        <div className={ROLAGEM_CLASS}>
          <div className="min-w-fit">
            <div className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
              <div className={HEADER_CELL_CLASS}>Operador</div>
              <div className={HEADER_CELL_CLASS}>Tema dominante</div>
              <div className={HEADER_CELL_CLASS}>Atendimentos</div>
              <div className={HEADER_CELL_CLASS}>Concentração</div>
            </div>

            {operadores.map((op, idx) => (
              <div
                key={op.operatorEmail}
                className={cn(LINHA_CLASS, idx < operadores.length - 1 && LINHA_SEPARADOR_CLASS)}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className={NOME_CELL_CLASS}>{formatNomeDotSobrenome(op.operatorEmail)}</div>
                <div className={cn(VALOR_CELL_CLASS, "text-foreground")}>{op.temaDominante}</div>
                <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>{op.qtdAtendimentos}</div>
                {/* Cor neutra (sem verde/vermelho) — mesma das demais colunas. */}
                <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>
                  {op.percentual.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
