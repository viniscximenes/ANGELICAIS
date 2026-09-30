
import {
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type { ForaDaCurvaItem } from "@/lib/tma/get-gestor-tma-analitico";
import { cn } from "@/lib/utils";

interface CardForaDaCurvaProps {
  curtas: number;
  longas: number;
  curtasLista: ForaDaCurvaItem[];
  longasLista: ForaDaCurvaItem[];
}

// MESMO layout de 3 colunas do Rechamada, só a última coluna troca de
// "horário" pra "TMA do atendimento" — proporção idêntica funciona igual
// bem aqui (Operador/Cliente/valor).
const GRID_COLS = "1.3fr 1fr 1.3fr";

/** Altura máxima de CADA sub-tabela (Curtas/Longas) antes do scroll vertical interno — REVERSÃO intencional da decisão anterior de "sem limite de altura" (as listas não têm mais limite de ITENS, então podem crescer bastante; menor que os 60vh da tabela Operador×Bucket porque aqui cabem DUAS tabelas empilhadas no mesmo card). */
const MAX_HEIGHT_PX = 320;

/** Fundo opaco do cabeçalho sticky (top) — mesma mistura de tokens já usada em CardRechamada/AnaliticoTmaTabela. */
const STICKY_HEADER_BG = "color-mix(in oklch, var(--muted) 40%, var(--card))";

/** Cabeçalho — MESMA classe literal de PausasDetalhadasAnalitico/AderenciaAnalitico (tempo-indisponibilidade): ds-body, text-muted-foreground/70. */
const HEADER_ROW_CLASS =
  "ds-body grid gap-0 bg-muted/40 font-bold tracking-wide uppercase text-muted-foreground";

/**
 * Uma das duas tabelas do card (Curtas ou Longas) — MESMO padrão de
 * tabela-padrao.tsx já usado em CardRechamada/AnaliticoTmaTabela
 * (TABELA_CONTAINER_CLASS/TABELA_HEADER_CLASS/etc.). Scroll vertical interno
 * (MAX_HEIGHT_PX, cabeçalho sticky top-0) — REVERSÃO intencional da decisão
 * anterior de "sem limite de altura": as listas continuam sem limite de
 * ITENS (decisão travada), mas agora rolam por dentro em vez de esticar o
 * card/slide indefinidamente.
 */
function TabelaForaDaCurva({
  titulo,
  total,
  itens,
}: {
  titulo: string;
  total: number;
  itens: ForaDaCurvaItem[];
}) {
  return (
    <div className="space-y-2">
      {/* Rótulo + contagem na mesma linha, logo acima da própria tabela —
          substitui o bloco de contagens solto (rótulo à esquerda, número
          distante à direita) que ficava desconectado das listas. */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-foreground uppercase">{titulo}</span>
        <span
          className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {total}
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="ds-small text-muted-foreground border-y border-border/40 py-4 text-center">
          Nenhuma chamada nesta faixa.
        </p>
      ) : (
      <div className="overflow-hidden border-y border-border/40">
        <div className="overflow-x-auto overflow-y-auto scrollbar-tema" style={{ maxHeight: MAX_HEIGHT_PX }}>
          <div data-fora-da-curva-tabela className="min-w-fit">
            <div
              className={cn(HEADER_ROW_CLASS, "sticky top-0 z-10")}
              style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA, background: STICKY_HEADER_BG }}
            >
              <div className={TABELA_HEADER_CELL_CLASS}>Operador</div>
              <div className={TABELA_HEADER_CELL_CLASS}>Cliente</div>
              <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>TMA do Atendimento</div>
            </div>

            {itens.map((item, idx) => {
              const isLast = idx === itens.length - 1;
              return (
                <div
                  key={`${item.telefoneCliente}-${idx}`}
                  className={TABELA_LINHA_CLASS}
                  style={{
                    gridTemplateColumns: GRID_COLS,
                    borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                  }}
                >
                  {/* Nome LITERAL (e-mail, parte local) — mesma exceção documentada em CardRechamada/EvolucaoTmaChart. Sem horário aqui (nem junto nem em coluna própria) — só o nome. */}
                  <div className={TABELA_NOME_CELL_CLASS}>{item.emailLocal}</div>
                  <div className={cn(TABELA_VALOR_CELL_CLASS, "ds-mono-sm")}>{item.telefoneCliente}</div>
                  <div className={cn(TABELA_VALOR_CELL_CLASS, "last:border-r-0 ds-mono-sm")}>
                    {formatKpiValue(item.duracaoSegundos, "time")}
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

/**
 * Contagens (Curtas/Longas) + as duas tabelas COMPLETAS (mesmo padrão visual
 * de tabela-padrao.tsx do CardRechamada) — REVERSÃO deliberada de uma
 * decisão anterior (que evitava expor telefone individual por ser dado
 * sensível); pedido explícito do usuário. Sem limite de ITENS (cada lista
 * mostra tudo), mas com scroll vertical interno por sub-tabela (ver
 * MAX_HEIGHT_PX/TabelaForaDaCurva) — outra reversão intencional, dessa vez
 * de "sem limite de altura". Coluna de valor é o TMA daquele atendimento
 * específico (formatKpiValue, MM:SS) — não mais o horário.
 */
export function CardForaDaCurva({ curtas, longas, curtasLista, longasLista }: CardForaDaCurvaProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground">
          Fora da curva
        </h3>
        <p className="ds-small text-muted-foreground mt-1">Chamadas muito curtas (&lt;30s) ou muito longas (&gt;30min).</p>
      </div>

      <div className="flex flex-col gap-6">
        <TabelaForaDaCurva titulo="Curtas (<30s)" total={curtas} itens={curtasLista} />
        <TabelaForaDaCurva titulo="Longas (>30min)" total={longas} itens={longasLista} />
      </div>
    </div>
  );
}
