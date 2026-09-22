import { IconPhoneCall } from "@tabler/icons-react";

import { StyledCard } from "@/components/gestor/styled-card";
import {
  TABELA_CONTAINER_CLASS,
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";
import type { RechamadaItem } from "@/lib/tma/get-gestor-tma-analitico";
import { cn } from "@/lib/utils";

interface CardRechamadaProps {
  clientesDistintos: number;
  clientesRecorrentes: number;
  percentual: number | null;
  lista: RechamadaItem[];
}

// 3 colunas simples (sem coluna sticky — cabe sem scroll horizontal na
// maioria das larguras; overflow-x-auto continua como rede de segurança,
// mesma técnica de AnaliticoTmaTabela). "Cliente" (telefone) um pouco mais
// estreita que as duas de atendimento (que carregam nome + horário).
const GRID_COLS = "1.3fr 1fr 1.3fr";

/** Altura máxima da tabela antes do scroll vertical interno entrar em ação — únca tabela da seção Analítico com esse limite (as outras crescem livremente, absorvidas pelo dynamicHeight do trilho); aqui o volume pode passar de 70+ linhas (rechamada cruzando o polo inteiro), então um teto com scroll próprio evita um card gigantesco. */
const MAX_HEIGHT_PX = 400;

/** Fundo opaco do cabeçalho sticky (top) — mesma mistura de tokens já usada pro cabeçalho sticky (esquerda) de AnaliticoTmaTabela; sem isso, linhas rolando por baixo apareceriam através do bg-muted/40 (40% de opacidade) do cabeçalho. */
const STICKY_HEADER_BG = "color-mix(in oklch, var(--muted) 40%, var(--card))";

/**
 * Célula de atendimento — nome + horário na MESMA linha ("email.local ·
 * HH:MM"), mesmo padrão já usado em CardPesoDesigual (separador " · ") e em
 * formatReportLabel ("nome ... às HH:MM"). Container = TABELA_NOME_CELL_CLASS
 * (ds-body font-medium, MESMA classe/fonte do nome do operador em
 * TmaTable/AnaliticoTmaTabela — não TABELA_VALOR_CELL_CLASS, que é
 * ds-mono-sm, pensada pra números/horários, não pra nome). Horário como
 * `<span>` à parte dentro da mesma célula, com sua própria classe
 * (ds-mono-sm text-muted-foreground) — pesos visuais diferentes (nome em
 * destaque, horário discreto), mas uma linha só, sem empilhar div.
 */
function CelulaAtendimento({ emailLocal, hora, className }: { emailLocal: string; hora: string; className?: string }) {
  return (
    <div className={cn(TABELA_NOME_CELL_CLASS, className)}>
      {emailLocal} <span className="ds-mono-sm text-muted-foreground">· {hora}</span>
    </div>
  );
}

/**
 * Número + percentual de clientes (telefone) que ligaram mais de uma vez no
 * dia, e a lista COMPLETA de recorrências — REVERSÃO deliberada de uma
 * decisão anterior (que evitava expor telefone/horário por ser dado
 * individual sensível); pedido explícito do usuário. Sem limite/truncamento
 * — o card cresce conforme o volume do dia.
 *
 * Lista em TABELA de verdade (não mais texto monoespaçado em bloco) — MESMAS
 * constantes de tabela-padrao.tsx já usadas em AnaliticoTmaTabela/TmaTable,
 * pra consistência visual com o resto da página (cabeçalho com cor/fundo
 * corretos nos dois temas, mesma fonte de corpo, mesmo hover de linha via
 * TABELA_LINHA_CLASS). Sem scroll vertical interno — a tabela cresce com o
 * card, mesmo comportamento das outras tabelas da seção Analítico.
 *
 * Nome em cada linha: e-mail LITERAL (parte local, minúsculo) — MESMA
 * exceção já documentada no tooltip de EvolucaoTmaChart (não é o nome
 * fantasia padrão do resto da página). NÃO troque por
 * formatNomeProprio/deriveNomeOperador/nome fantasia numa manutenção
 * futura — é intencional.
 */
export function CardRechamada({ clientesDistintos, clientesRecorrentes, percentual, lista }: CardRechamadaProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconPhoneCall size={20} className="text-foreground" />
          Rechamada
        </h3>
        <p className="ds-small text-muted-foreground mt-1">Clientes que ligaram mais de uma vez hoje.</p>
      </div>

      <StyledCard className="flex flex-col px-5 py-5 gap-4" withGradient corners="all">
        {percentual === null ? (
          <p className="ds-display text-4xl font-bold text-foreground">—</p>
        ) : (
          <div>
            <p className="ds-display text-4xl font-bold tracking-tight text-foreground">
              {percentual.toFixed(1)}%
            </p>
            <p className="ds-small text-muted-foreground mt-1.5">
              {clientesRecorrentes} de {clientesDistintos} clientes distintos
            </p>
          </div>
        )}

        {lista.length > 0 && (
          <div className={TABELA_CONTAINER_CLASS}>
            <div className="overflow-x-auto overflow-y-auto scrollbar-tema" style={{ maxHeight: MAX_HEIGHT_PX }}>
              <div className="min-w-fit">
                <div
                  className={cn(TABELA_HEADER_CLASS, "text-foreground sticky top-0 z-10")}
                  style={{ gridTemplateColumns: GRID_COLS, ...TABELA_HEADER_BORDA, background: STICKY_HEADER_BG }}
                >
                  <div className={TABELA_HEADER_CELL_CLASS}>1º Atendimento</div>
                  <div className={TABELA_HEADER_CELL_CLASS}>Cliente</div>
                  <div className={TABELA_HEADER_CELL_ULTIMA_CLASS}>2º Atendimento</div>
                </div>

                {lista.map((item, idx) => {
                  const isLast = idx === lista.length - 1;
                  return (
                    <div
                      key={item.telefoneCliente}
                      className={TABELA_LINHA_CLASS}
                      style={{
                        gridTemplateColumns: GRID_COLS,
                        borderBottom: isLast ? "none" : "1px solid var(--border)/40",
                      }}
                    >
                      <CelulaAtendimento emailLocal={item.emailLocalPrimeiro} hora={item.horaPrimeiro} />
                      <div className={cn(TABELA_VALOR_CELL_CLASS, "ds-mono-sm")}>{item.telefoneCliente}</div>
                      <CelulaAtendimento
                        emailLocal={item.emailLocalUltimo}
                        hora={item.horaUltimo}
                        className="last:border-r-0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </StyledCard>
    </div>
  );
}
