import type { CSSProperties } from "react";

import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";
import { UploadDropzone } from "@/components/d-1/upload-dropzone";
import {
  TABELA_HEADER_BORDA,
  TABELA_HEADER_CELL_CLASS,
  TABELA_HEADER_CELL_ULTIMA_CLASS,
  TABELA_HEADER_CLASS,
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_BULLET_CLASS,
  TABELA_VALOR_CELL_CLASS,
  ValorSemDado,
  ValorSemantico,
  corNomeOperador,
  fundoLinhaRuim,
} from "@/components/gestor/tabela-padrao";
import {
  MIN_PEDIDOS_BAIXO_RENDIMENTO,
  type CoordenadorConsolidado,
  type ResumoTaxa,
  type Turno,
} from "@/lib/coordenador/get-coordenador-consolidado";

import { ConfigMetaPoloPopover } from "./config-meta-polo-popover";

const TURNO_LABEL: Record<Turno, string> = { manha: "Manhã", tarde: "Tarde" };

function formatTx(tx: number | null) {
  return tx === null ? null : `${(tx * 100).toFixed(1).replace(".", ",")}%`;
}

function abaixo(tx: number | null, meta: number) {
  return tx !== null && tx < meta / 100;
}

function corTx(tx: number | null, meta: number) {
  if (tx === null) return "text-foreground";
  return abaixo(tx, meta) ? "text-danger" : "text-success";
}

/* ───────── Cards de taxa (polo / manhã / tarde) ───────── */

function CardTaxa({
  titulo,
  resumo,
  meta,
  destaque = false,
}: {
  titulo: string;
  resumo: ResumoTaxa;
  meta: number;
  destaque?: boolean;
}) {
  const tx = formatTx(resumo.txRetencao);
  return (
    <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-lg border border-border bg-card/70 p-6 shadow-[var(--shadow-sm)] backdrop-blur-md">
      {destaque && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 h-full w-[3px]"
          style={{ background: "var(--primary)" }}
        />
      )}
      <div>
        <p className="ds-small text-muted-foreground mb-1 tracking-wider uppercase">{titulo}</p>
        <p
          className={`ds-display font-semibold tracking-tight ${destaque ? "text-5xl" : "text-4xl"} ${corTx(resumo.txRetencao, meta)}`}
        >
          {tx ?? "—"}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
        {[
          { label: "Pedidos", valor: resumo.pedidos },
          { label: "Retidos", valor: resumo.retidos },
          { label: "Churn", valor: resumo.cancelados },
        ].map((item) => (
          <div key={item.label}>
            <dt className="ds-small text-muted-foreground tracking-wider uppercase">{item.label}</dt>
            <dd className="ds-mono-sm text-foreground font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
              {item.valor}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ───────── Tabelas ───────── */

function TituloBloco({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <header className="pb-4">
      <h2 className="font-sans text-2xl font-semibold tracking-tight text-foreground">{titulo}</h2>
      <p className="font-sans text-muted-foreground pt-1 text-sm">{subtitulo}</p>
    </header>
  );
}

function TurnoBadge({ turno }: { turno: Turno | null }) {
  if (!turno) return <ValorSemDado />;
  return <span className="text-muted-foreground">{TURNO_LABEL[turno]}</span>;
}

function Cabecalho({ colunas, grid }: { colunas: string[]; grid: CSSProperties }) {
  return (
    <div className={TABELA_HEADER_CLASS} style={{ ...grid, ...TABELA_HEADER_BORDA }}>
      {colunas.map((c, i) => (
        <div key={c} className={i === colunas.length - 1 ? TABELA_HEADER_CELL_ULTIMA_CLASS : TABELA_HEADER_CELL_CLASS}>
          {c}
        </div>
      ))}
    </div>
  );
}

const ULTIMA = "!border-r-0";

function TabelaSupervisores({ dados, meta }: { dados: CoordenadorConsolidado["supervisores"]; meta: number }) {
  const grid: CSSProperties = { gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr 1fr 1.2fr" };
  return (
    <KpiFrame>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <Cabecalho
            grid={grid}
            colunas={["Supervisor", "Turno", "Operadores", "Pedidos", "Retidos", "Abaixo meta", "Tx Retenção"]}
          />
          {dados.map((s) => {
            const ruim = abaixo(s.txRetencao, meta);
            const tx = formatTx(s.txRetencao);
            return (
              <div
                key={s.gestorId}
                className={`${TABELA_LINHA_CLASS} border-t border-border/40`}
                style={{ ...grid, background: fundoLinhaRuim(ruim) }}
              >
                <div className={TABELA_NOME_CELL_CLASS} style={{ color: corNomeOperador({ ruim }) }}>
                  {s.nome}
                </div>
                <div className={TABELA_VALOR_CELL_CLASS}>
                  <TurnoBadge turno={s.turno} />
                </div>
                <div className={TABELA_VALOR_CELL_CLASS}>{s.operadores}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{s.pedidos}</div>
                <div className={TABELA_VALOR_CELL_CLASS}>{s.retidos}</div>
                <div className={TABELA_VALOR_CELL_CLASS} style={{ color: s.abaixoDaMeta > 0 ? "var(--danger)" : undefined }}>
                  {s.abaixoDaMeta}
                </div>
                <div className={`${TABELA_VALOR_BULLET_CLASS} ${ULTIMA}`}>
                  {tx ? <ValorSemantico ruim={ruim}>{tx}</ValorSemantico> : <ValorSemDado />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </KpiFrame>
  );
}

function TabelaBaixoRendimento({
  dados,
  meta,
}: {
  dados: CoordenadorConsolidado["baixoRendimento"];
  meta: number;
}) {
  const grid: CSSProperties = { gridTemplateColumns: "2fr 1.8fr 0.9fr 0.9fr 0.9fr 0.9fr 1.1fr" };
  if (dados.length === 0) {
    return (
      <div
        className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
        style={{ border: "1px solid var(--border)" }}
      >
        Nenhum operador abaixo da meta de {meta}% até agora.
      </div>
    );
  }
  return (
    <KpiFrame>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <Cabecalho
            grid={grid}
            colunas={["Operador", "Supervisor", "Turno", "Pedidos", "Retidos", "Churn", "Tx Retenção"]}
          />
          {dados.map((op) => (
            <div
              key={op.email}
              className={`${TABELA_LINHA_CLASS} border-t border-border/40`}
              style={{ ...grid, background: fundoLinhaRuim(true) }}
            >
              <div className={TABELA_NOME_CELL_CLASS} style={{ color: corNomeOperador({ ruim: true }) }}>
                {op.email.split("@")[0]}
              </div>
              <div className={`${TABELA_VALOR_CELL_CLASS} truncate`}>{op.supervisor}</div>
              <div className={TABELA_VALOR_CELL_CLASS}>
                <TurnoBadge turno={op.turno} />
              </div>
              <div className={TABELA_VALOR_CELL_CLASS}>{op.pedidos}</div>
              <div className={TABELA_VALOR_CELL_CLASS}>{op.retidos}</div>
              <div className={TABELA_VALOR_CELL_CLASS}>{op.cancelados}</div>
              <div className={`${TABELA_VALOR_BULLET_CLASS} ${ULTIMA}`}>
                <ValorSemantico ruim>{formatTx(op.txRetencao)}</ValorSemantico>
              </div>
            </div>
          ))}
        </div>
      </div>
    </KpiFrame>
  );
}

/* ───────── Página ───────── */

function formatCabecalhoReport(hora: string | null, nome: string | null): string | null {
  if (!hora || hora === "00:00" || hora === "00:00:00") return null;
  const horaCurta = hora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? hora;
  const quem = nome?.trim();
  return quem ? `${quem} fez report às ${horaCurta}` : `Atualizado às ${horaCurta}`;
}

export function CoordenadorConsolidadoView({
  dados,
  meta,
}: {
  dados: CoordenadorConsolidado;
  meta: number;
}) {
  const cabecalhoReport = formatCabecalhoReport(dados.reportHora, dados.reportNomeSupervisor);
  const semDados = dados.polo.pedidos === 0 && dados.supervisores.length === 0;

  return (
    <div className="space-y-10">
      {/* Cabeçalho + controles + anexo — mesma estrutura de
          /reports/tempo-indisponibilidade (título, linha de controles com a
          engrenagem, card de anexo em largura cheia logo abaixo). */}
      <div className="space-y-4">
        <div>
          <div className="pt-4">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Consolidado
            </h1>
            <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
              {cabecalhoReport ?? "Aguardando o primeiro report do dia"}
              {" · "}Meta {meta}%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
            <ConfigMetaPoloPopover metaInicial={meta} />
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <UploadDropzone variante="vertical" />
        </div>
      </div>

      {semDados ? (
        <div
          className="elevation-1 ds-body text-muted-foreground rounded-xl px-6 py-10 text-center"
          style={{ border: "1px solid var(--border)" }}
        >
          A base do dia ainda não foi atualizada.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <CardTaxa titulo="Taxa do Polo" resumo={dados.polo} meta={meta} destaque />
            </div>
            <CardTaxa titulo="Manhã" resumo={dados.manha} meta={meta} />
            <CardTaxa titulo="Tarde" resumo={dados.tarde} meta={meta} />
          </section>

          <section>
            <TituloBloco
              titulo="Supervisores"
              subtitulo="Taxa de retenção por equipe, agrupada por turno (pior taxa primeiro)."
            />
            <TabelaSupervisores dados={dados.supervisores} meta={meta} />
          </section>

          <section>
            <TituloBloco
              titulo="Operadores de baixo rendimento"
              subtitulo={`Abaixo da meta de ${meta}% com pelo menos ${MIN_PEDIDOS_BAIXO_RENDIMENTO} pedidos no dia.`}
            />
            <TabelaBaixoRendimento dados={dados.baixoRendimento} meta={meta} />
          </section>
        </>
      )}
    </div>
  );
}
