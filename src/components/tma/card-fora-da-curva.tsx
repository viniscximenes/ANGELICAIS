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
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { ForaDaCurvaItem } from "@/lib/tma/get-gestor-tma-analitico";
import { cn } from "@/lib/utils";

interface CardForaDaCurvaProps {
  curtas: number;
  longas: number;
  curtasLista: ForaDaCurvaItem[];
  longasLista: ForaDaCurvaItem[];
}

// Operador : Cliente : TMA do atendimento.
const GRID_COLS = "minmax(184px, 1.3fr) minmax(150px, 1fr) minmax(180px, 1.3fr)";

/**
 * Uma das duas tabelas do card (Curtas ou Longas): rótulo + contagem logo
 * acima, tabela rolando por dentro (as listas não têm limite de itens). As
 * duas dividem a altura do card (min-h-0, encolhem conforme o conteúdo).
 */
function TabelaForaDaCurva({ titulo, total, itens }: { titulo: string; total: number; itens: ForaDaCurvaItem[] }) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-foreground uppercase">{titulo}</span>
        <span
          data-fora-curva-total
          className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground"
        >
          {total}
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="ds-small text-muted-foreground shrink-0 py-3 text-center">Nenhuma chamada nesta faixa.</p>
      ) : (
        <div className={ROLAGEM_CLASS}>
          <div className="min-w-fit">
            <div className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
              <div className={HEADER_CELL_CLASS}>Operador</div>
              <div className={HEADER_CELL_CLASS}>Cliente</div>
              <div className={HEADER_CELL_CLASS}>TMA do Atendimento</div>
            </div>

            {itens.map((item, idx) => (
              <div
                key={`${item.telefoneCliente}-${idx}`}
                className={cn(LINHA_CLASS, idx < itens.length - 1 && LINHA_SEPARADOR_CLASS)}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                {/* Nome LITERAL (e-mail, parte local) — mesma exceção documentada em CardRechamada. */}
                <div className={NOME_CELL_CLASS}>{item.emailLocal}</div>
                <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>{item.telefoneCliente}</div>
                <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>
                  {formatKpiValue(item.duracaoSegundos, "time")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Fora da curva" — contagens (Curtas/Longas) + as duas listas COMPLETAS
 * (pedido explícito: expõe telefone). Coluna de valor = TMA daquele
 * atendimento (MM:SS).
 */
export function CardForaDaCurva({ curtas, longas, curtasLista, longasLista }: CardForaDaCurvaProps) {
  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Fora da curva</h3>
        <p className="ds-small text-muted-foreground mt-1">Chamadas muito curtas (&lt;30s) ou muito longas (&gt;30min).</p>
      </div>

      {curtasLista.length === 0 && longasLista.length === 0 ? (
        <GraficoVazio
          titulo="Nenhuma chamada fora da curva hoje"
          descricao="Nenhuma chamada abaixo de 30s ou acima de 30min."
        />
      ) : (
        <div className="flex min-h-0 flex-col gap-6">
          <TabelaForaDaCurva titulo="Curtas (<30s)" total={curtas} itens={curtasLista} />
          <TabelaForaDaCurva titulo="Longas (>30min)" total={longas} itens={longasLista} />
        </div>
      )}
    </div>
  );
}
