"use client";

import { useState } from "react";
import { IconUsers } from "@tabler/icons-react";

import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import {
  quartilDoOperador,
  type QuartilOperador,
} from "@/lib/retencao/get-quartil-operador";
import { StyledCard } from "@/components/gestor/styled-card";
import { OperadorDetalheDialog } from "./operador-detalhe-dialog";

interface OperadoresListaProps {
  operadores: OperadorIndividual[];
  /** Meta de 0 a 100 (gestor_config_fantasia.meta_tx_retencao). */
  meta: number;
  /** Quartil por operador (equipe/empresa), indexado por prefixo do email. */
  quartilPorOperador: Record<string, QuartilOperador>;
}

/**
 * Retorna o identificador nome.sobrenome extraído do login/email do operador.
 */
function resolverNome(op: OperadorIndividual): string {
  return op.login.split("@")[0] ?? op.login;
}

export function OperadoresLista({
  operadores,
  meta,
  quartilPorOperador,
}: OperadoresListaProps) {
  const [selecionado, setSelecionado] = useState<OperadorIndividual | null>(null);
  const [open, setOpen] = useState(false);

  const metaFracao = meta / 100;

  // Filtra apenas os operadores com dados registrados (total > 0 e tx != null)
  const operadoresComDados = operadores.filter(
    (op) => op.tx !== null && op.total > 0,
  );

  function abrir(op: OperadorIndividual) {
    setSelecionado(op);
    setOpen(true);
  }

  return (
    <div className="space-y-3">
      {/* ── Título e descrição fora do card ─────────────────────────── */}
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconUsers size={20} className="text-foreground" />
          Operadores
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Clique no operador para ver o detalhamento individual de atendimentos.
        </p>
      </div>

      {/* ── Card em StyledCard com cantos azuis e fundo escurecido ──── */}
      <StyledCard className="p-0 overflow-hidden" withGradient>
        {operadoresComDados.length === 0 ? (
          <p className="ds-small text-muted-foreground p-6 text-center">
            Nenhum operador com atendimentos no período.
          </p>
        ) : (
          <ul className="divide-border/30 divide-y">
            {operadoresComDados.map((op) => {
              const abaixo = op.tx! < metaFracao;
              const nome = resolverNome(op);
              const qInfo = quartilDoOperador(quartilPorOperador, op.login);
              const qTag = qInfo?.equipe?.quartil ?? null;

              return (
                <li key={op.login}>
                  <button
                    type="button"
                    onClick={() => abrir(op)}
                    className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  >
                    {/* Indicador: verde bate a meta, vermelho não bate */}
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{
                        background: abaixo ? "var(--danger)" : "var(--success)",
                      }}
                    />

                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      <span className="ds-small truncate text-foreground font-medium">
                        {nome}
                      </span>
                      {qTag && (
                        <span className="ds-mono-sm text-xs text-muted-foreground font-mono shrink-0">
                          {qTag}
                        </span>
                      )}
                    </div>

                    <span
                      className={`ds-mono-sm shrink-0 tabular-nums font-semibold ${
                        abaixo ? "text-danger" : "text-success"
                      }`}
                    >
                      {(op.tx! * 100).toFixed(1)}%
                    </span>

                    <span className="ds-mono-sm text-muted-foreground shrink-0 text-right tabular-nums">
                      {op.total} pedidos
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </StyledCard>

      <OperadorDetalheDialog
        operador={selecionado}
        nomeExibido={selecionado ? resolverNome(selecionado) : ""}
        open={open}
        onOpenChange={setOpen}
        meta={meta}
        quartil={
          selecionado ? quartilDoOperador(quartilPorOperador, selecionado.login) : null
        }
      />
    </div>
  );
}
