import {
  CARD_CLASS,
  gridColunas,
  HEADER_CELL_CLASS,
  HEADER_ROW_CLASS,
  LINHA_CLASS,
  LINHA_SEPARADOR_CLASS,
  NOME_CELL_CLASS,
  ROLAGEM_CLASS,
  STICKY_HEADER_CELL_CLASS,
  STICKY_NOME_CELL_CLASS,
  VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-analitico";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import { SKILL_BUCKET_LABELS, SKILL_BUCKET_ORDER, type SkillBucket } from "@/lib/tma/skills-retencao";
import { cn } from "@/lib/utils";

// Piso único das colunas de dado: maior rótulo ("HOTLINE + CHURN", ~120px) + px-4, com folga.
const GRID_COLS = gridColunas(SKILL_BUCKET_ORDER.length, 160);

interface Props {
  /** Roster completo do gestor (emails normalizados, minúsculo). */
  roster: string[];
  /** email normalizado → TMA médio (segundos) por bucket; bucket sem atendimento = null. */
  porOperadorPorBucket: Map<string, Record<SkillBucket, number | null>>;
}

/**
 * "TMA por tema - Operador" — tabela Operador × skill bucket. Parte do
 * ROSTER completo (não só quem atendeu hoje), por isso nunca fica vazia
 * enquanto houver equipe; célula sem atendimento = "—". Rola por dentro do
 * card (nas duas direções), com cabeçalho e coluna Operador fixos.
 */
export function AnaliticoTmaTabela({ roster, porOperadorPorBucket }: Props) {
  return (
    <div className={CARD_CLASS}>
      <div className="shrink-0">
        <h3 className="ds-h3 font-semibold text-foreground">TMA por tema - Operador</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Detalhamento do TMA médio de cada operador por tema de atendimento.
        </p>
      </div>

      <div className={ROLAGEM_CLASS}>
        <div className="min-w-fit">
          <div className={HEADER_ROW_CLASS} style={{ gridTemplateColumns: GRID_COLS }}>
            <div className={cn(HEADER_CELL_CLASS, STICKY_HEADER_CELL_CLASS)}>Operador</div>
            {SKILL_BUCKET_ORDER.map((bucket) => (
              <div key={bucket} className={HEADER_CELL_CLASS}>
                {SKILL_BUCKET_LABELS[bucket]}
              </div>
            ))}
          </div>

          {roster.map((email, idx) => {
            const porBucket = porOperadorPorBucket.get(email);
            return (
              <div
                key={email}
                className={cn(LINHA_CLASS, idx < roster.length - 1 && LINHA_SEPARADOR_CLASS)}
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className={cn(NOME_CELL_CLASS, STICKY_NOME_CELL_CLASS)}>{formatNomeDotSobrenome(email)}</div>
                {SKILL_BUCKET_ORDER.map((bucket) => {
                  const valor = porBucket?.[bucket] ?? null;
                  return (
                    <div
                      key={bucket}
                      className={cn(
                        VALOR_CELL_CLASS,
                        "tabular-nums",
                        valor === null ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {valor === null ? "—" : formatKpiValue(valor, "time")}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
