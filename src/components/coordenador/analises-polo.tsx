"use client";

import {
  TIPOS_RETENCAO,
  type ContagemTipoRetencao,
  type FaceIdResumo,
  type RecorteTaxa,
  type ResumoTaxa,
  type SupervisorLinha,
  type TemaPolo,
  type TipoRetencao,
  type MetasTemas,
  metaDoTema,
} from "@/lib/coordenador/types";

import { cn } from "@/lib/utils";

import {
  TABELA_LINHA_CLASS,
  TABELA_NOME_CELL_CLASS,
  TABELA_VALOR_CELL_CLASS,
} from "@/components/gestor/tabela-padrao";

import { abaixoDaMeta, formatMarca, formatTx } from "./format";
import { Cabecalho, CelulaTx } from "./tabela-supervisores";
import { MatrizTaxaSupervisor, MIN_PEDIDOS_MATRIZ } from "./matriz-taxa-supervisor";

function SubTitulo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
      <p className="ds-small text-muted-foreground mt-1">{texto}</p>
    </div>
  );
}

/* ───────── Motivo da retenção ───────── */

function totalTipos(c: ContagemTipoRetencao) {
  return TIPOS_RETENCAO.reduce((acc, t) => acc + c[t], 0);
}

/** Colunas da tabela: Negociação + Outros juntos em "Outros" (volume baixo). */
const COLUNAS_TIPO: { label: string; tipos: TipoRetencao[] }[] = [
  { label: "Sem concessão", tipos: ["Sem concessão"] },
  { label: "Desconto", tipos: ["Desconto"] },
  { label: "Troca de plano", tipos: ["Troca de plano"] },
  { label: "Troca + desconto", tipos: ["Troca de plano + desconto"] },
  { label: "Outros", tipos: ["Negociação", "Outros"] },
];

/**
 * "Motivo da retenção" — % dos retidos de cada equipe por tipo de retenção.
 * Mesmo visual da "Taxa por marca" / "Taxa por tema" (tabela [data-tabela-temas],
 * título ds-h3, linhas py-3, divisórias border/30), sem hover (não expande) e
 * sem as colunas "Retidos" e "Composição" (a quantidade aparece no tooltip de
 * cada %). "Sem concessão" verde/vermelho vs. o polo; linha
 * POLO no fim no visual do cabeçalho.
 */
export function QualidadeRetencao({
  polo,
  supervisores,
}: {
  polo: ContagemTipoRetencao;
  supervisores: SupervisorLinha[];
}) {
  const totalPolo = totalTipos(polo);
  const refSemConcessao = totalPolo > 0 ? polo["Sem concessão"] / totalPolo : null;
  const num = { fontVariantNumeric: "tabular-nums" as const };

  const linha = (chave: string, nome: string, contagem: ContagemTipoRetencao, total = false) => {
    const retidos = totalTipos(contagem);
    const celula = cn(
      "px-4 py-3 text-center align-middle text-xs",
      total ? "font-bold text-foreground" : "ds-mono-sm font-medium text-foreground",
    );
    return (
      <tr
        key={chave}
        className={cn("align-middle", total && "bg-muted/40 border-t border-border")}
      >
        <td
          className={cn(
            "px-4 py-3 align-middle text-xs whitespace-nowrap text-foreground",
            total ? "ds-body font-bold uppercase tracking-wide" : "ds-body font-semibold",
          )}
        >
          {nome}
        </td>
        {COLUNAS_TIPO.map((c, i) => {
          const q = c.tipos.reduce((acc, t) => acc + contagem[t], 0);
          const pct = retidos > 0 ? q / retidos : null;
          // "Sem concessão": verde se igual/acima do polo, vermelho se abaixo.
          const cor =
            i === 0 && !total && pct !== null && refSemConcessao !== null
              ? pct + 0.0005 >= refSemConcessao
                ? "text-success font-semibold"
                : "text-danger font-semibold"
              : "";
          return (
            <td key={c.label} className={cn(celula, cor)} style={num} title={`${q} de ${retidos} retidos`}>
              {pct === null ? "—" : `${Math.round(pct * 100)}%`}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 text-foreground font-semibold">Motivo da retenção</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Como cada equipe retém o cliente, em % dos retidos. Sem concessão não reduz receita; desconto e troca de
          plano reduzem. Em “Sem concessão”, verde = igual ou acima do polo, vermelho = abaixo.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table data-tabela-temas className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="ds-body text-muted-foreground border-border/40 bg-muted/40 border-b text-[11px] font-bold tracking-wider uppercase select-none">
              <th className="px-4 py-2.5 whitespace-nowrap">Supervisor</th>
              {COLUNAS_TIPO.map((c) => (
                <th key={c.label} className="w-[130px] px-4 py-2.5 text-center whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border/30 divide-y">
            {supervisores.map((s) => linha(s.gestorId, s.nome, s.tiposRetencao))}
            {linha("polo", "Polo", polo, true)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Impacto do FaceID ───────── */

/** Taxa atual × taxa se os abortados no FaceID contassem como retidos. */
function taxasFaceId(retidos: number, cancelados: number, abortados: number) {
  const pedidos = retidos + cancelados;
  const atual = pedidos > 0 ? retidos / pedidos : null;
  const comFaceId = pedidos + abortados > 0 ? (retidos + abortados) / (pedidos + abortados) : null;
  const diferenca = atual !== null && comFaceId !== null ? comFaceId - atual : null;
  return { atual, comFaceId, diferenca };
}

/** Diferença em pontos percentuais: "+2,3 p.p." */
function formatPp(d: number | null): string {
  if (d === null) return "—";
  const v = (d * 100).toFixed(1).replace(".", ",");
  return `${d > 0 ? "+" : ""}${v} p.p.`;
}

/**
 * "Impacto do FaceID": quanto a taxa de retenção mudaria se os atendimentos
 * que terminaram ABORTADOS no FaceID (fora da taxa hoje) contassem como
 * retidos. Taxa com FaceID = (retidos + abortados) ÷ (pedidos + abortados).
 * Resumo do polo em cards (mesmo visual dos cards de taxa do topo) + tabela
 * por equipe no visual das demais (data-tabela-temas, sem hover), maior
 * ganho primeiro, linha POLO no fim.
 */
export function FaceIdBloco({
  faceId,
  polo,
  supervisores,
  meta,
}: {
  faceId: FaceIdResumo;
  polo: ResumoTaxa;
  supervisores: SupervisorLinha[];
  meta: number;
}) {
  const totalPolo = taxasFaceId(polo.retidos, polo.cancelados, faceId.abortados);
  const corTx = (tx: number | null) =>
    tx === null ? "text-muted-foreground" : tx < meta / 100 ? "text-danger" : "text-success";
  const num = { fontVariantNumeric: "tabular-nums" as const };

  const linhas = supervisores
    .map((s) => ({ s, ...taxasFaceId(s.retidos, s.cancelados, s.abortados) }))
    .sort((a, b) => (b.diferenca ?? -1) - (a.diferenca ?? -1) || b.s.abortados - a.s.abortados);

  const resumo = [
    { label: "Taxa atual", valor: formatTx(totalPolo.atual), classe: corTx(totalPolo.atual) },
    { label: "Taxa com FaceID", valor: formatTx(totalPolo.comFaceId), classe: corTx(totalPolo.comFaceId) },
    { label: "Diferença", valor: formatPp(totalPolo.diferenca), classe: "text-foreground" },
    { label: "Abortados no FaceID", valor: faceId.abortados.toLocaleString("pt-BR"), classe: "text-foreground" },
  ];

  const linha = (
    chave: string,
    nome: string,
    abortados: number,
    t: ReturnType<typeof taxasFaceId>,
    total = false,
  ) => {
    const celula = cn("px-4 py-3 text-center align-middle text-xs", total ? "font-bold" : "ds-mono-sm font-medium");
    return (
      <tr key={chave} className={cn("align-middle", total && "bg-muted/40 border-t border-border")}>
        <td
          className={cn(
            "text-foreground px-4 py-3 align-middle text-xs whitespace-nowrap",
            total ? "ds-body font-bold tracking-wide uppercase" : "ds-body font-semibold",
          )}
        >
          {nome}
        </td>
        <td className={cn(celula, "text-foreground")} style={num}>
          {abortados.toLocaleString("pt-BR")}
        </td>
        <td className={cn(celula, "font-semibold", corTx(t.atual))} style={num}>
          {formatTx(t.atual)}
        </td>
        <td className={cn(celula, "font-semibold", corTx(t.comFaceId))} style={num}>
          {formatTx(t.comFaceId)}
        </td>
        <td className={cn(celula, "text-foreground")} style={num}>
          {formatPp(t.diferenca)}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      <SubTitulo
        titulo="Impacto do FaceID"
        texto="Quanto a taxa de retenção subiria se os atendimentos abortados no FaceID contassem como retidos — taxa com FaceID = (retidos + abortados) ÷ (pedidos + abortados). Equipes com maior ganho primeiro."
      />

      <div data-coord-faceid-resumo className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumo.map((r) => (
          <div
            key={r.label}
            data-coord-stat
            className="rounded-lg border border-border bg-card/70 px-4 py-3 shadow-[var(--shadow-sm)]"
          >
            <p className="ds-small text-muted-foreground tracking-wider uppercase">{r.label}</p>
            <p className={cn("mt-1 text-2xl font-semibold tracking-tight", r.classe)} style={num}>
              {r.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table data-tabela-temas className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="ds-body text-muted-foreground border-border/40 bg-muted/40 border-b text-[11px] font-bold tracking-wider uppercase select-none">
              <th className="px-4 py-2.5 whitespace-nowrap">Supervisor</th>
              <th className="w-[130px] px-4 py-2.5 text-center whitespace-nowrap">Abortados</th>
              <th className="w-[130px] px-4 py-2.5 text-center whitespace-nowrap">Taxa atual</th>
              <th className="w-[150px] px-4 py-2.5 text-center whitespace-nowrap">Taxa com FaceID</th>
              <th className="w-[130px] px-4 py-2.5 text-center whitespace-nowrap">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-border/30 divide-y">
            {linhas.map((l) => linha(l.s.gestorId, l.s.nome, l.s.abortados, l))}
            {linha("polo", "Polo", faceId.abortados, totalPolo, true)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Tema × supervisor ───────── */

/** Ordem fixa das colunas de tema (pedido do coordenador); tema fora da lista vai pro fim. */
const ORDEM_TEMAS = [
  "Mot. Financeiro",
  "Ins. Atendimento",
  "Ins. Serviço",
  "Mud. Provedora",
  "Mud. Endereço",
  "Outros",
];

function posicaoTema(tema: string): number {
  const i = ORDEM_TEMAS.indexOf(tema);
  return i === -1 ? ORDEM_TEMAS.length : i;
}

/**
 * Taxa de cada tema em cada equipe — mesma matriz do "Taxa por hora -
 * Supervisor" (MatrizTaxaSupervisor). Cada coluna é colorida pela meta do
 * próprio tema (engrenagem), como a "Taxa por tema - Polo".
 */
export function TemaPorSupervisor({
  temas,
  supervisores,
  meta,
  metasTemas,
}: {
  temas: TemaPolo[];
  supervisores: SupervisorLinha[];
  meta: number;
  metasTemas: MetasTemas;
}) {
  return (
    <MatrizTaxaSupervisor
      titulo="Taxa por tema - Supervisores"
      descricao={`Taxa de retenção de cada equipe em cada tema. Passe o mouse sobre uma taxa para ver pedidos, retidos e cancelados. Células esmaecidas têm menos de ${MIN_PEDIDOS_MATRIZ} pedidos.`}
      supervisores={supervisores}
      colunas={temas
        .filter((t) => t.pedidos > 0)
        .sort((a, b) => posicaoTema(a.tema) - posicaoTema(b.tema))
        .map((t) => ({ chave: t.tema, rotulo: t.tema, meta: metaDoTema(t.tema, metasTemas, meta) }))}
      celula={(s, chave) => s.temas[chave] ?? null}
      meta={meta}
    />
  );
}

/* ───────── Taxa por marca ───────── */

/**
 * Taxa por marca no MESMO visual da "Taxa por tema - Polo" / "Taxa por
 * regional" (TabelaTemas: título ds-h3, cabeçalho via [data-tabela-temas] em
 * reports-consolidado.css, linhas py-3, divisórias border/30, taxa colorida
 * pela meta), mas sem a coluna "% dos canc." e SEM expansão — então sem
 * chevron, sem cursor de clique e sem cor no hover. Maior taxa primeiro.
 */
export function TaxaPorMarca({ marcas, meta }: { marcas: RecorteTaxa[]; meta: number }) {
  const linhas = [...marcas].sort((a, b) => {
    if (a.txRetencao === null && b.txRetencao === null) return b.pedidos - a.pedidos;
    if (a.txRetencao === null) return 1;
    if (b.txRetencao === null) return -1;
    return b.txRetencao - a.txRetencao;
  });
  const num = { fontVariantNumeric: "tabular-nums" as const };
  const corTx = (tx: number | null) =>
    tx === null ? "text-muted-foreground" : abaixoDaMeta(tx, meta) ? "text-danger" : "text-success";

  return (
    <div className="space-y-3">
      <div>
        <h3 className="ds-h3 text-foreground font-semibold">Taxa por marca</h3>
        <p className="ds-small text-muted-foreground mt-1">
          Retenção de cada marca no polo, da maior para a menor taxa.
        </p>
      </div>
      {linhas.length === 0 ? (
        <p className="text-muted-foreground px-2 py-6 text-center text-sm">Sem atendimentos na base do dia.</p>
      ) : (
        <div className="overflow-x-auto">
          <table data-tabela-temas className="w-full border-collapse text-left">
            <thead>
              <tr className="ds-body text-muted-foreground border-border/40 bg-muted/40 border-b text-[11px] font-bold tracking-wider uppercase select-none">
                <th className="px-4 py-2.5 whitespace-nowrap">Marca</th>
                <th className="w-[110px] px-4 py-2.5 text-center whitespace-nowrap">Total</th>
                <th className="w-[110px] px-4 py-2.5 text-center whitespace-nowrap">Retidos</th>
                <th className="w-[110px] px-4 py-2.5 text-center whitespace-nowrap">Cancelados</th>
                <th className="w-[130px] px-4 py-2.5 text-center whitespace-nowrap">Tx Retenção</th>
              </tr>
            </thead>
            <tbody className="divide-border/30 divide-y">
              {linhas.map((m) => (
                <tr key={m.chave} className="align-middle">
                  <td className="ds-body text-foreground px-4 py-3 align-middle text-xs font-semibold whitespace-nowrap">
                    {formatMarca(m.chave)}
                  </td>
                  <td className="ds-mono-sm text-foreground px-4 py-3 text-center align-middle text-xs font-medium" style={num}>
                    {m.pedidos.toLocaleString("pt-BR")}
                  </td>
                  <td className="ds-mono-sm text-foreground px-4 py-3 text-center align-middle text-xs font-medium" style={num}>
                    {m.retidos.toLocaleString("pt-BR")}
                  </td>
                  <td className="ds-mono-sm text-foreground px-4 py-3 text-center align-middle text-xs font-medium" style={num}>
                    {m.cancelados.toLocaleString("pt-BR")}
                  </td>
                  <td className={`ds-mono-sm px-4 py-3 text-center align-middle text-xs font-semibold ${corTx(m.txRetencao)}`} style={num}>
                    {m.txRetencao !== null ? `${(m.txRetencao * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
