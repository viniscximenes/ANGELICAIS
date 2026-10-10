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
import type { RechamadaItem } from "@/lib/tma/get-gestor-tma-analitico";
import { cn } from "@/lib/utils";

interface CardRechamadaProps {
  clientesDistintos: number;
  clientesRecorrentes: number;
  percentual: number | null;
  lista: RechamadaItem[];
}

// 1º Atendimento : Cliente : 2º Atendimento.
const GRID_COLS = "minmax(200px, 1.3fr) minmax(150px, 1fr) minmax(200px, 1.3fr)";

/** Célula de atendimento — nome + horário na mesma linha ("email.local · HH:MM"). */
function CelulaAtendimento({ emailLocal, hora }: { emailLocal: string; hora: string }) {
  return (
    <div className={NOME_CELL_CLASS}>
      {emailLocal} <span className="font-normal tabular-nums text-muted-foreground">· {hora}</span>
    </div>
  );
}

/**
 * "Rechamada" — percentual de clientes (telefone) que ligaram mais de uma
 * vez no dia e a lista COMPLETA das recorrências (decisão do usuário: expõe
 * telefone e horário).
 *
 * Nome em cada linha: e-mail LITERAL (parte local, minúsculo) — mesma
 * exceção documentada no tooltip de EvolucaoTmaChart (não é o nome
 * fantasia do resto da página). NÃO troque por nome fantasia numa
 * manutenção futura — é intencional.
 */
export function CardRechamada({ clientesDistintos, clientesRecorrentes, percentual, lista }: CardRechamadaProps) {
  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">Rechamada</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento dos clientes que ligaram mais de uma vez no dia, com o operador e o horário do 1º e do 2º atendimento.
        </p>
      </div>

      {lista.length === 0 ? (
        <GraficoVazio
          titulo="Nenhuma rechamada hoje"
          descricao="Nenhum cliente ligou mais de uma vez no dia."
        />
      ) : (
        <>
          <div className="shrink-0">
            <p className="ds-display text-4xl font-semibold tracking-tight text-foreground">
              {percentual === null ? "—" : `${percentual.toFixed(1)}%`}
            </p>
            <p className="ds-small text-muted-foreground mt-1.5">
              {clientesRecorrentes} de {clientesDistintos} clientes distintos
            </p>
          </div>

          <div className={ROLAGEM_CLASS}>
            <div className="min-w-fit">
              <div className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
                <div className={HEADER_CELL_CLASS}>1º Atendimento</div>
                <div className={HEADER_CELL_CLASS}>Cliente</div>
                <div className={HEADER_CELL_CLASS}>2º Atendimento</div>
              </div>

              {lista.map((item, idx) => (
                <div
                  key={item.telefoneCliente}
                  className={cn(LINHA_CLASS, idx < lista.length - 1 && LINHA_SEPARADOR_CLASS)}
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <CelulaAtendimento emailLocal={item.emailLocalPrimeiro} hora={item.horaPrimeiro} />
                  <div className={cn(VALOR_CELL_CLASS, "tabular-nums text-foreground")}>{item.telefoneCliente}</div>
                  <CelulaAtendimento emailLocal={item.emailLocalSegundo} hora={item.horaSegundo} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
