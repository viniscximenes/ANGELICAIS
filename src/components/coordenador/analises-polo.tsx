"use client";

import {
  TIPOS_RETENCAO,
  type ContagemTipoRetencao,
  type FaceIdResumo,
  type JornadaAborto,
  type RecorteTaxa,
  type SupervisorLinha,
  type TemaPolo,
  type TipoRetencao,
} from "@/lib/coordenador/types";

import { cn } from "@/lib/utils";

import {
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";

import { abaixoDaMeta, formatMarca } from "./format";
import { Cabecalho, CelulaTx } from "./tabela-supervisores";

function SubTitulo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
      <p className="ds-small text-muted-foreground mt-1">{texto}</p>
    </div>
  );
}

/* ───────── Custo das retenções ───────── */

const COR_TIPO: Record<TipoRetencao, string> = {
  "Sem concessão": "var(--success)",
  Desconto: "var(--warning)",
  "Troca de plano": "color-mix(in oklab, var(--primary) 70%, transparent)",
  "Troca de plano + desconto": "var(--danger)",
  Negociação: "color-mix(in oklab, var(--warning) 55%, transparent)",
  Outros: "var(--muted-foreground)",
};

function totalTipos(c: ContagemTipoRetencao) {
  return TIPOS_RETENCAO.reduce((acc, t) => acc + c[t], 0);
}

/** Barra fina de composição (mesma altura da barra de taxa da EquipeTable). */
function BarraTipos({ contagem }: { contagem: ContagemTipoRetencao }) {
  const total = totalTipos(contagem);
  if (total === 0)
    return <div className="bg-muted/40 h-1.5 w-full rounded-full" />;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full">
      {TIPOS_RETENCAO.map((t) =>
        contagem[t] > 0 ? (
          <div
            key={t}
            style={{
              width: `${(contagem[t] / total) * 100}%`,
              background: COR_TIPO[t],
            }}
            title={`${t}: ${contagem[t]} (${((contagem[t] / total) * 100).toFixed(0)}%)`}
          />
        ) : null,
      )}
    </div>
  );
}

/** Colunas da tabela: Negociação + Outros juntos em "Outros" (volume baixo). */
const COLUNAS_TIPO: { label: string; tipos: TipoRetencao[] }[] = [
  { label: "Sem concessão", tipos: ["Sem concessão"] },
  { label: "Desconto", tipos: ["Desconto"] },
  { label: "Troca de plano", tipos: ["Troca de plano"] },
  { label: "Troca + desconto", tipos: ["Troca de plano + desconto"] },
  { label: "Outros", tipos: ["Negociação", "Outros"] },
];

const GRID_CUSTO = {
  gridTemplateColumns: "1.6fr 0.8fr 1.1fr 0.9fr 1fr 1.1fr 0.8fr 1.6fr",
};

function LinhaCusto({
  nome,
  contagem,
  refSemConcessao,
  total = false,
}: {
  nome: string;
  contagem: ContagemTipoRetencao;
  /** % sem concessão do polo — referência de cor da coluna "Sem concessão". */
  refSemConcessao: number | null;
  total?: boolean;
}) {
  const retidos = totalTipos(contagem);
  const pct = (tipos: TipoRetencao[]) => {
    const q = tipos.reduce((acc, t) => acc + contagem[t], 0);
    return { q, p: retidos > 0 ? q / retidos : null };
  };
  const cell = cn(
    "min-w-0 px-3 text-center border-r border-border/30",
    total ? "py-2.5" : "ds-mono-sm py-2",
  );
  return (
    <div
      className={cn(
        total
          ? "ds-body grid items-center gap-0 bg-muted/20 font-bold"
          : cn(TABELA_LINHA_CLASS, "border-t border-border/40"),
      )}
      style={{
        ...GRID_CUSTO,
        ...(total
          ? {
              borderTop: "2px solid var(--border)",
              borderBottom: "2px double var(--border)",
            }
          : {}),
      }}
    >
      <div
        className={cn(
          total ? cell : TABELA_NOME_CELL_CLASS,
          "text-foreground truncate",
        )}
      >
        {nome}
      </div>
      <div className={cell} style={{ fontVariantNumeric: "tabular-nums" }}>
        {retidos}
      </div>
      {COLUNAS_TIPO.map((c, i) => {
        const { q, p } = pct(c.tipos);
        // "Sem concessão": verde se igual/acima do polo, vermelho se abaixo.
        const cor =
          i === 0 && p !== null && refSemConcessao !== null
            ? p + 0.0005 >= refSemConcessao
              ? "var(--success)"
              : "var(--danger)"
            : undefined;
        return (
          <div
            key={c.label}
            className={cell}
            title={`${q} de ${retidos} retidos`}
          >
            <span
              style={{
                color: cor,
                fontWeight: i === 0 ? 600 : undefined,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p === null ? "—" : `${Math.round(p * 100)}%`}
            </span>
          </div>
        );
      })}
      <div className="flex min-w-0 items-center px-3 py-2">
        <BarraTipos contagem={contagem} />
      </div>
    </div>
  );
}

export function QualidadeRetencao({
  polo,
  supervisores,
}: {
  polo: ContagemTipoRetencao;
  supervisores: SupervisorLinha[];
}) {
  const totalPolo = totalTipos(polo);
  const refSemConcessao =
    totalPolo > 0 ? polo["Sem concessão"] / totalPolo : null;

  return (
    <div className="space-y-3">
      <SubTitulo
        titulo="Custo das retenções"
        texto="Como cada equipe retém o cliente. Sem concessão não custa nada; desconto e troca de plano reduzem receita. Valores em % dos clientes retidos — verde/vermelho em “Sem concessão” compara com o polo."
      />
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {TIPOS_RETENCAO.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: COR_TIPO[t] }}
            />
            {t}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <Cabecalho
            grid={GRID_CUSTO}
            colunas={[
              "Supervisor",
              "Retidos",
              ...COLUNAS_TIPO.map((c) => c.label),
              "Composição",
            ]}
          />
          {supervisores.map((s) => (
            <LinhaCusto
              key={s.gestorId}
              nome={s.nome}
              contagem={s.tiposRetencao}
              refSemConcessao={refSemConcessao}
            />
          ))}
          <LinhaCusto
            nome="POLO"
            contagem={polo}
            refSemConcessao={refSemConcessao}
            total
          />
        </div>
      </div>
    </div>
  );
}

/* ───────── Atendimentos abortados (Face ID) ───────── */

const GRID_ABORTADOS = {
  gridTemplateColumns: "1.6fr 1fr 1fr 1.1fr 1fr 1fr 1fr",
};

function LinhaAbortados({
  nome,
  contratos,
  j,
  refPct,
  total = false,
}: {
  nome: string;
  /** Contratos atendidos no dia (desfecho final: retido, cancelado ou abortado). */
  contratos: number;
  j: JornadaAborto;
  /** % de contratos com aborto no polo — referência de cor. */
  refPct: number | null;
  total?: boolean;
}) {
  const pct = contratos > 0 ? j.contratosComAborto / contratos : null;
  const acima = pct !== null && refPct !== null && pct > refPct + 0.0005;
  const cell = cn(
    "min-w-0 px-3 text-center border-r border-border/30",
    total ? "py-2.5" : "ds-mono-sm py-2",
  );
  const num = { fontVariantNumeric: "tabular-nums" as const };
  return (
    <div
      className={
        total
          ? "ds-body grid items-center gap-0 bg-muted/20 font-bold"
          : cn(TABELA_LINHA_CLASS, "border-t border-border/40")
      }
      style={{
        ...GRID_ABORTADOS,
        ...(total
          ? {
              borderTop: "2px solid var(--border)",
              borderBottom: "2px double var(--border)",
            }
          : {}),
      }}
    >
      <div
        className={cn(
          total ? cell : TABELA_NOME_CELL_CLASS,
          "text-foreground truncate",
        )}
      >
        {nome}
      </div>
      <div className={cell} style={num}>
        {j.tentativasAbortadas}
      </div>
      <div className={cell} style={num}>
        {j.contratosComAborto}
      </div>
      <div className={cell}>
        <span
          style={{
            ...num,
            color: total
              ? undefined
              : acima
                ? "var(--danger)"
                : "var(--success)",
            fontWeight: 600,
          }}
        >
          {pct === null ? "—" : `${(pct * 100).toFixed(1)}%`}
        </span>
      </div>
      <div className={cell} style={num}>
        {j.terminaramAbortados}
      </div>
      <div className={cell} style={num}>
        {j.viraramCancelamento}
      </div>
      <div className={cn(cell, "!border-r-0")} style={num}>
        {j.viraramRetencao}
      </div>
    </div>
  );
}

export function FaceIdBloco({
  faceId,
  supervisores,
}: {
  faceId: FaceIdResumo;
  supervisores: SupervisorLinha[];
}) {
  const contratosDe = (s: SupervisorLinha) => s.pedidos + s.abortados;
  const contratosPolo = supervisores.reduce(
    (acc, s) => acc + contratosDe(s),
    0,
  );
  const refPct =
    contratosPolo > 0
      ? faceId.jornada.contratosComAborto / contratosPolo
      : null;
  const j = faceId.jornada;

  return (
    <div className="space-y-3">
      <SubTitulo
        titulo="Atendimentos abortados"
        texto="Abortos = tentativas abortadas no dia (Face ID não realizado ou reprovado, etapa não concluída). Contratos = clientes que tiveram pelo menos um aborto; depois, o contrato Abortou de vez, Cancelou ou foi Retido numa nova tentativa. Vermelho em % contratos = equipe com mais abortos que o polo."
      />
      <p className="text-muted-foreground text-xs">
        No polo:{" "}
        <span className="text-foreground">{j.tentativasAbortadas}</span>{" "}
        tentativas abortadas em{" "}
        <span className="text-foreground">{j.contratosComAborto}</span>{" "}
        contratos
        {faceId.porStatus.length > 0 && (
          <>
            {" "}
            (
            {faceId.porStatus.map((s, i) => (
              <span key={s.status}>
                {i > 0 && " · "}
                <span className="text-foreground">{s.quantidade}</span>{" "}
                {s.status.replace(/^Abortado\s*-\s*/i, "")}
              </span>
            ))}
            )
          </>
        )}
        . Depois:{" "}
        <span className="text-foreground">{j.viraramCancelamento}</span> viraram
        cancelamento,{" "}
        <span className="text-foreground">{j.viraramRetencao}</span> foram
        retidos e{" "}
        <span className="text-foreground">{j.terminaramAbortados}</span>{" "}
        terminaram abortados.
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <Cabecalho
            grid={GRID_ABORTADOS}
            colunas={[
              "Supervisor",
              "Abortos",
              "Contratos",
              "% contratos",
              "Abortou",
              "Cancelou",
              "Reteve",
            ]}
          />
          {supervisores.map((s) => (
            <LinhaAbortados
              key={s.gestorId}
              nome={s.nome}
              contratos={contratosDe(s)}
              j={s.jornadaAborto}
              refPct={refPct}
            />
          ))}
          <LinhaAbortados
            nome="POLO"
            contratos={contratosPolo}
            j={j}
            refPct={refPct}
            total
          />
        </div>
      </div>
    </div>
  );
}

/* ───────── Tema × supervisor ───────── */

/** Abaixo disso a célula fica apagada (amostra pequena). */
const MIN_PEDIDOS_TEMA = 3;

/**
 * Taxa de retenção de cada tema em cada equipe — mesmo visual da "Tabela de
 * taxa por hora" (sem bordas/linhas, colunas iguais, cabeçalho do
 * Consolidado). Célula: taxa colorida pela meta + cancelados embaixo.
 * Sem título próprio: vive dentro do bloco "Resultado por tema".
 */
export function TemaPorSupervisor({
  temas,
  supervisores,
  meta,
}: {
  temas: TemaPolo[];
  supervisores: SupervisorLinha[];
  meta: number;
}) {
  const colunas = temas.filter((t) => t.pedidos > 0).map((t) => t.tema);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-xs">
        <colgroup>
          <col style={{ width: "10.5rem" }} />
          {colunas.map((t) => (
            <col key={t} />
          ))}
        </colgroup>
        <thead>
          <tr className="ds-body bg-muted/40 text-foreground font-bold tracking-wide uppercase">
            <th className="px-2 py-2.5 text-center align-middle whitespace-nowrap">
              Supervisor
            </th>
            {colunas.map((t) => (
              <th
                key={t}
                className="truncate px-1 py-2.5 text-center align-middle whitespace-nowrap"
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {supervisores.map((s) => (
            <tr key={s.gestorId}>
              <td className="ds-body text-foreground truncate px-3 py-1.5 text-center font-medium">
                {s.nome}
              </td>
              {colunas.map((t) => {
                const cel = s.temas[t];
                const pedidos = cel ? cel.retidos + cel.cancelados : 0;
                if (!cel || pedidos === 0) {
                  return (
                    <td
                      key={t}
                      className="text-muted-foreground/50 p-1 text-center"
                    >
                      ·
                    </td>
                  );
                }
                const tx = cel.retidos / pedidos;
                const ruim = abaixoDaMeta(tx, meta);
                const pequena = pedidos < MIN_PEDIDOS_TEMA;
                return (
                  <td key={t} className="p-1 text-center">
                    <div
                      className="rounded px-1 py-1"
                      style={{
                        background: `color-mix(in oklab, ${ruim ? "var(--danger)" : "var(--success)"} ${pequena ? 8 : 18}%, transparent)`,
                        opacity: pequena ? 0.6 : 1,
                      }}
                      title={`${s.nome} · ${t}: ${cel.retidos} retidos, ${cel.cancelados} cancelados`}
                    >
                      <div
                        className={cn(
                          "font-semibold",
                          ruim ? "text-danger" : "text-success",
                        )}
                      >
                        {Math.round(tx * 100)}%
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {pedidos} {pedidos === 1 ? "pedido" : "pedidos"}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Marca e unidade ───────── */

const GRID_RECORTE = { gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr" };

/** Tabela no padrão do Consolidado: Nome | Tx | Pedidos | Retidos | Cancelados | % dos canc. */
function TabelaRecorte({
  primeira,
  linhas,
  meta,
  totalCancelados,
  nome,
}: {
  primeira: string;
  linhas: RecorteTaxa[];
  meta: number;
  totalCancelados: number;
  nome: (l: RecorteTaxa) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <Cabecalho
          grid={GRID_RECORTE}
          colunas={[
            primeira,
            "Tx Retenção",
            "Pedidos",
            "Retidos",
            "Cancelados",
            "% dos canc.",
          ]}
        />
        {linhas.map((l) => (
          <div
            key={l.chave}
            className={cn(TABELA_LINHA_CLASS, "border-t border-border/40")}
            style={GRID_RECORTE}
          >
            <div
              className={cn(TABELA_NOME_CELL_CLASS, "text-foreground")}
              title={nome(l)}
            >
              {nome(l)}
            </div>
            <CelulaTx
              tx={l.txRetencao}
              meta={meta}
              className="border-r border-border/30"
            />
            <div className={TABELA_VALOR_CELL_CLASS}>{l.pedidos}</div>
            <div className={TABELA_VALOR_CELL_CLASS}>{l.retidos}</div>
            <div className={TABELA_VALOR_CELL_CLASS}>{l.cancelados}</div>
            <div className={cn(TABELA_VALOR_CELL_CLASS, "!border-r-0")}>
              {totalCancelados > 0
                ? `${((l.cancelados / totalCancelados) * 100).toFixed(1)}%`
                : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarcasUnidades({
  marcas,
  unidades,
  meta,
  mostrar = "ambos",
}: {
  marcas: RecorteTaxa[];
  unidades: RecorteTaxa[];
  meta: number;
  /** Qual tabela renderizar — cada uma vira um slide próprio no trilho. */
  mostrar?: "ambos" | "marcas" | "cidades";
}) {
  // Marcas cobrem todos os atendimentos do polo → soma = total de cancelados.
  const totalCancelados = marcas.reduce((acc, m) => acc + m.cancelados, 0);
  return (
    <div className="grid gap-8">
      {mostrar !== "cidades" && (
        <div className="space-y-3">
          <SubTitulo
            titulo="Por marca"
            texto="Retenção de cada marca no polo, da que tem mais pedidos para a que tem menos."
          />
          <TabelaRecorte
            primeira="Marca"
            linhas={marcas}
            meta={meta}
            totalCancelados={totalCancelados}
            nome={(l) => formatMarca(l.chave)}
          />
        </div>
      )}
      {mostrar !== "marcas" && (
        <div className="space-y-3">
          <SubTitulo
            titulo="Cidades com mais cancelamentos"
            texto="As 15 unidades que mais cancelaram no dia."
          />
          <TabelaRecorte
            primeira="Unidade"
            linhas={unidades}
            meta={meta}
            totalCancelados={totalCancelados}
            nome={(l) => (l.detalhe ? `${l.chave} · ${l.detalhe}` : l.chave)}
          />
        </div>
      )}
    </div>
  );
}
