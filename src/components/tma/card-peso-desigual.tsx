import { TABELA_HEADER_BORDA } from "@/components/gestor/tabela-padrao";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import type { OperadorPesoDesigual } from "@/lib/tma/calcular-peso-desigual";
import { cn } from "@/lib/utils";

interface CardPesoDesigualProps {
  operadores: OperadorPesoDesigual[];
}

/**
 * Visual = "TMA por tema - Operador" (AnaliticoTmaTabela), que segue a
 * "Tabela de pausas detalhadas" do tempo-indisponibilidade: cabeçalho
 * ds-body bold uppercase tracking-wide (cor por tema em reports-tma-peso.css),
 * células py-3 px-4 text-xs, linhas separadas só por border/30 (sem
 * divisórias verticais, sem hover), cabeçalho com uma cor só.
 */
const HEADER_ROW_CLASS = "ds-body grid gap-0 bg-muted/40 font-bold tracking-wide uppercase";
const HEADER_CELL_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2.5 text-center";
const NOME_CELL_CLASS = "min-w-0 truncate whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-foreground";
const VALOR_CELL_CLASS = "min-w-0 whitespace-nowrap px-4 py-3 text-center text-xs font-medium text-foreground";

// Operador : Tema dominante : Atendimentos : Concentração.
const GRID_COLS = "minmax(180px, 1.4fr) minmax(150px, 1.2fr) minmax(130px, 1fr) minmax(130px, 1fr)";

/**
 * Lista de operadores concentrando >= 60% dos atendimentos do dia num único
 * tema (piso mínimo de 5 atendimentos) — nome sempre REAL (sem nome
 * fantasia), mesma regra da tabela "TMA por tema - Operador" do Analítico.
 */
export function CardPesoDesigual({ operadores }: CardPesoDesigualProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground">
          Peso desigual
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento dos operadores que concentram 60% ou mais dos atendimentos do dia num único tema.
        </p>
      </div>

      {operadores.length === 0 ? (
        <p className="ds-small text-muted-foreground border-y border-border/40 py-4 text-center">
          Nenhum operador com peso desigual no dia.
        </p>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-tema">
            <div data-peso-desigual-tabela className="min-w-fit">
              <div
                className={HEADER_ROW_CLASS}
                style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA }}
              >
                <div className={HEADER_CELL_CLASS}>Operador</div>
                <div className={HEADER_CELL_CLASS}>Tema dominante</div>
                <div className={HEADER_CELL_CLASS}>Atendimentos</div>
                <div className={HEADER_CELL_CLASS}>Concentração</div>
              </div>

              {operadores.map((op, idx) => {
                const isLast = idx === operadores.length - 1;
                return (
                  <div
                    key={op.operatorEmail}
                    className={cn("grid items-center gap-0", !isLast && "border-b border-border/30")}
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div className={NOME_CELL_CLASS}>{formatNomeDotSobrenome(op.operatorEmail)}</div>
                    <div className={VALOR_CELL_CLASS}>{op.temaDominante}</div>
                    <div className={VALOR_CELL_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {op.qtdAtendimentos}
                    </div>
                    {/* Cor neutra (sem verde/vermelho) — mesma das demais colunas. */}
                    <div className={VALOR_CELL_CLASS} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {op.percentual.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
