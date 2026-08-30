"use client";

import { forwardRef } from "react";

import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import type {
  AnaliseOperadorSerial,
  KpiSerie,
  PontoSerie,
} from "@/lib/kpi/analise-operadores/serial-types";
import { resolverTendencia } from "@/lib/kpi/analise-operadores/tendencia";

import { PdfChart, type PdfChartPalette } from "./pdf-chart";
import type { IdentificacaoMeta } from "./identificacao-bloco";

// Paleta FIXA do documento (standalone light — igual ao template de ref).
const PAL: PdfChartPalette = {
  ok: "#1e7a3d",
  bad: "#b23030",
  grid: "#eef0f3",
  muted: "#97a0ac",
  meta: "#9aa2ad",
};

const CHART_W = 626;
const CHART_H = 150;

const CSS = `
.pdf-doc-root {
  --ink:#1c2434; --ink-soft:#5b6472; --ink-faint:#97a0ac;
  --line:#e2e5ea; --line-soft:#eef0f3;
  --q1-bg:#e6f4ea; --q1-fg:#1e7a3d; --q1-border:#b9e3c6;
  --q2-bg:#fdf3d8; --q2-fg:#8a6a00; --q2-border:#f3e2a0;
  --q3-bg:#fde7d6; --q3-fg:#b6560f; --q3-border:#f6c9a4;
  --q4-bg:#fbe1e1; --q4-fg:#b23030; --q4-border:#f3bcbc;
  --ok-fg:#1e7a3d; --bad-fg:#b23030; --neutral-fg:#6b7280;
  position:fixed; left:-99999px; top:0;
}
.pdf-doc-root * { box-sizing:border-box; }
.pdf-doc-root .sheet {
  width:794px; min-height:1123px; background:#fff; color:var(--ink);
  font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
  padding:40px 44px 36px; display:flex; flex-direction:column;
}
.pdf-doc-root .doc-header {
  display:flex; justify-content:space-between; align-items:flex-end;
  border-bottom:2px solid var(--ink); padding-bottom:12px; margin-bottom:26px;
}
.pdf-doc-root .doc-header .title { font-size:19px; font-weight:700; letter-spacing:-0.01em; }
.pdf-doc-root .doc-header .subtitle { font-size:12px; color:var(--ink-soft); margin-top:3px; }
.pdf-doc-root .doc-header .badge-op { font-size:11px; color:var(--ink-soft); text-align:right; }
.pdf-doc-root .doc-header .badge-op strong { color:var(--ink); font-weight:600; }
.pdf-doc-root .doc-footer {
  margin-top:auto; padding-top:12px; border-top:1px solid var(--line);
  display:flex; justify-content:space-between; font-size:9.5px; color:var(--ink-faint);
}
.pdf-doc-root .op-strip {
  display:flex; gap:28px; background:var(--line-soft); border:1px solid var(--line);
  border-radius:6px; padding:14px 18px; margin-bottom:22px;
}
.pdf-doc-root .op-strip .field { flex:1; }
.pdf-doc-root .op-strip .field .label { font-size:9.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-faint); margin-bottom:3px; }
.pdf-doc-root .op-strip .field .value { font-size:13.5px; font-weight:600; }
.pdf-doc-root .section-label {
  font-size:11px; text-transform:uppercase; letter-spacing:.07em;
  color:var(--ink-soft); font-weight:700; margin:4px 0 10px;
}
.pdf-doc-root table.report-table { width:100%; border-collapse:collapse; font-size:11.5px; }
.pdf-doc-root table.report-table thead th {
  text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.04em;
  color:var(--ink-soft); font-weight:700; padding:8px 10px; border-bottom:1.5px solid var(--ink);
}
.pdf-doc-root table.report-table tbody td { padding:9px 10px; border-bottom:1px solid var(--line-soft); vertical-align:middle; }
.pdf-doc-root table.report-table tbody tr:last-child td { border-bottom:1px solid var(--line); }
.pdf-doc-root table.report-table td.kpi-name { font-weight:600; }
.pdf-doc-root table.report-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
.pdf-doc-root .pill {
  display:inline-block; font-size:10.5px; font-weight:700; padding:3px 10px;
  border-radius:100px; border:1px solid transparent; line-height:1.3;
}
.pdf-doc-root .pill.q1 { background:var(--q1-bg); color:var(--q1-fg); border-color:var(--q1-border); }
.pdf-doc-root .pill.q2 { background:var(--q2-bg); color:var(--q2-fg); border-color:var(--q2-border); }
.pdf-doc-root .pill.q3 { background:var(--q3-bg); color:var(--q3-fg); border-color:var(--q3-border); }
.pdf-doc-root .pill.q4 { background:var(--q4-bg); color:var(--q4-fg); border-color:var(--q4-border); }
.pdf-doc-root .pill.neutral { background:#eef0f3; color:var(--ink-soft); border-color:var(--line); }
.pdf-doc-root .trend { font-weight:600; font-size:11.5px; }
.pdf-doc-root .trend.good { color:var(--ok-fg); }
.pdf-doc-root .trend.bad { color:var(--bad-fg); }
.pdf-doc-root .trend.flat { color:var(--neutral-fg); }
.pdf-doc-root .trend .arrow { margin-right:3px; }
.pdf-doc-root .note-box {
  margin-top:16px; font-size:10.5px; color:var(--ink-soft); background:var(--line-soft);
  border-left:3px solid var(--ink-faint); padding:8px 12px; border-radius:0 4px 4px 0;
}
.pdf-doc-root .kpi-block { border:1px solid var(--line); border-radius:8px; padding:18px 20px 16px; margin-bottom:18px; }
.pdf-doc-root .kpi-block-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
.pdf-doc-root .kpi-block-head .name { font-size:14.5px; font-weight:700; }
.pdf-doc-root .kpi-block-head .meta { font-size:11px; color:var(--ink-soft); margin-top:2px; }
.pdf-doc-root .kpi-block-head .avg { text-align:right; }
.pdf-doc-root .kpi-block-head .avg .value { font-size:20px; font-weight:700; }
.pdf-doc-root .kpi-block-head .avg .label { font-size:9px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint); }
.pdf-doc-root .kpi-block-head .avg.ok .value { color:var(--ok-fg); }
.pdf-doc-root .kpi-block-head .avg.bad .value { color:var(--bad-fg); }
.pdf-doc-root .chart-area { width:100%; height:${CHART_H}px; margin-bottom:14px; }
.pdf-doc-root table.mini-table { width:100%; border-collapse:collapse; font-size:10.5px; }
.pdf-doc-root table.mini-table.dense { font-size:9px; }
.pdf-doc-root table.mini-table thead th {
  text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.04em;
  color:var(--ink-faint); font-weight:700; padding:5px 8px; border-bottom:1px solid var(--line);
}
.pdf-doc-root table.mini-table tbody td { padding:6px 8px; border-bottom:1px solid var(--line-soft); }
.pdf-doc-root table.mini-table.dense tbody td { padding:3px 8px; }
.pdf-doc-root table.mini-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
.pdf-doc-root table.mini-table tr.off-row td { color:var(--ink-faint); font-style:italic; }
.pdf-doc-root .sec-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 28px; }
.pdf-doc-root table.sec-table { width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:8px; }
.pdf-doc-root table.sec-table thead th {
  text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.04em;
  color:var(--ink-faint); font-weight:700; padding:6px 8px; border-bottom:1px solid var(--line);
}
.pdf-doc-root table.sec-table tbody td { padding:6px 8px; border-bottom:1px solid var(--line-soft); }
.pdf-doc-root table.sec-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
`;

// ── helpers ────────────────────────────────────────────────────────
function mediaDe(pontos: PontoSerie[]): number | null {
  const v = pontos
    .map((p) => p.valorPlot)
    .filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function ultimoPlotado(pontos: PontoSerie[]): PontoSerie | undefined {
  return [...pontos].reverse().find((p) => p.valorPlot !== null);
}
function mesesExcluidos(
  data: AnaliseOperadorSerial,
): { label: string; motivo: string }[] {
  const base = data.principais[0]?.pontos ?? data.secundarios[0]?.pontos ?? [];
  return base
    .filter((p) => p.metaStatusRotulo !== null)
    .map((p) => ({ label: p.label, motivo: p.metaStatusRotulo as string }));
}
/** Binário vs a linha de meta (coincide com a cor da linha do gráfico). */
function binStatus(
  v: number | null,
  serie: KpiSerie,
): { txt: string; cls: "ok" | "bad" | "" } {
  if (
    v === null ||
    serie.metaLinha === null ||
    !(serie.direction === "higher_better" || serie.direction === "lower_better")
  ) {
    return { txt: "—", cls: "" };
  }
  const dentro =
    serie.direction === "higher_better"
      ? v >= serie.metaLinha
      : v <= serie.metaLinha;
  return dentro ? { txt: "Na meta", cls: "ok" } : { txt: "Fora", cls: "bad" };
}
/** Semáforo real (enrich) — usado só na tabela de secundários. */
function secStatus(s: PontoSerie["status"]): {
  txt: string;
  cls: "ok" | "bad" | "warn" | "";
} {
  if (s === "success") return { txt: "Na meta", cls: "ok" };
  if (s === "danger") return { txt: "Fora", cls: "bad" };
  if (s === "warning") return { txt: "Atenção", cls: "warn" };
  return { txt: "—", cls: "" };
}
function avgCls(media: number | null, serie: KpiSerie): "ok" | "bad" | "" {
  if (media === null || serie.metaLinha === null) return "";
  if (serie.direction === "higher_better")
    return media >= serie.metaLinha ? "ok" : "bad";
  if (serie.direction === "lower_better")
    return media <= serie.metaLinha ? "ok" : "bad";
  return "";
}
function corTexto(cls: string): string | undefined {
  if (cls === "ok") return "var(--ok-fg)";
  if (cls === "bad") return "var(--bad-fg)";
  if (cls === "warn") return "var(--q2-fg)";
  return undefined;
}

function Header({ meta }: { meta: IdentificacaoMeta }) {
  return (
    <div className="doc-header">
      <div>
        <div className="title">Relatório de Performance</div>
        <div className="subtitle">
          {meta.operador} &nbsp;·&nbsp; Período: {meta.periodoLabel} ({meta.intervalo})
        </div>
      </div>
      <div className="badge-op">
        Gerado por <strong>{meta.gestorNome}</strong>
        <br />
        {meta.geradoEm}
      </div>
    </div>
  );
}
function Footer({ meta, n }: { meta: IdentificacaoMeta; n: number }) {
  return (
    <div className="doc-footer">
      <span>
        Gerado por {meta.gestorNome} — {meta.geradoEm}
      </span>
      <span>Página {n}/4</span>
    </div>
  );
}

function TrendCell({ serie }: { serie: KpiSerie }) {
  const { seta, cls, rotulo } = resolverTendencia(serie.pontos, serie.direction);
  return (
    <span className={`trend ${cls}`}>
      <span className="arrow">{seta}</span>
      {rotulo}
    </span>
  );
}

function QuartilPill({ q }: { q: 1 | 2 | 3 | 4 | null }) {
  if (!q) return <span className="pill neutral">—</span>;
  return <span className={`pill q${q}`}>Q{q}</span>;
}

function KpiBlock({ serie }: { serie: KpiSerie }) {
  const media = mediaDe(serie.pontos);
  const cls = avgCls(media, serie);
  const dense = serie.pontos.length > 6;

  return (
    <div className="kpi-block">
      <div className="kpi-block-head">
        <div>
          <div className="name">{serie.displayName}</div>
          <div className="meta">
            {serie.metaLinha !== null
              ? `Meta: ${formatKpiValue(serie.metaLinha, serie.valueType)}`
              : "Sem meta definida"}
          </div>
        </div>
        <div className={`avg ${cls}`}>
          <div className="value">
            {media !== null ? formatKpiValue(media, serie.valueType) : "—"}
          </div>
          <div className="label">Média do período</div>
        </div>
      </div>

      <div className="chart-area">
        <PdfChart
          serie={serie}
          width={CHART_W}
          height={CHART_H}
          palette={PAL}
        />
      </div>

      <table className={`mini-table${dense ? " dense" : ""}`}>
        <thead>
          <tr>
            <th>Mês</th>
            <th className="num">Valor</th>
            <th>Status</th>
            <th>Quartil</th>
          </tr>
        </thead>
        <tbody>
          {serie.pontos.map((p) => {
            if (p.metaStatusRotulo) {
              return (
                <tr key={p.mesRef} className="off-row">
                  <td>{p.label}</td>
                  <td
                    className="num"
                    style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                  >
                    {p.valor !== null
                      ? formatKpiValue(p.valor, serie.valueType)
                      : "—"}
                  </td>
                  <td>{p.metaStatusRotulo}</td>
                  <td>{p.metaStatusRotulo}</td>
                </tr>
              );
            }
            const st = binStatus(p.valor, serie);
            return (
              <tr key={p.mesRef}>
                <td>{p.label}</td>
                <td
                  className="num"
                  style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                >
                  {p.valor !== null
                    ? formatKpiValue(p.valor, serie.valueType)
                    : "—"}
                </td>
                <td style={{ color: corTexto(st.cls), fontWeight: st.cls ? 600 : undefined }}>
                  {st.txt}
                </td>
                <td>
                  {serie.temQuartil ? <QuartilPill q={p.quartil} /> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SecTable({ series }: { series: KpiSerie[] }) {
  return (
    <table className="sec-table">
      <thead>
        <tr>
          <th>KPI</th>
          <th className="num">Valor</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {series.map((serie) => {
          const ult = ultimoPlotado(serie.pontos);
          const st = ult ? secStatus(ult.status) : { txt: "—", cls: "" as const };
          return (
            <tr key={serie.slug}>
              <td>{serie.displayName}</td>
              <td className="num">
                {ult && ult.valor !== null
                  ? formatKpiValue(ult.valor, serie.valueType)
                  : "—"}
              </td>
              <td style={{ color: corTexto(st.cls) }}>{st.txt}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Documento PDF de análise por operador — 4 "sheets" (794px, A4 @96dpi)
 * reproduzindo ref/template-pdf-analise-operadores.html. Paleta própria
 * fixa (light). Cada `[data-pdf-page="N"]` é capturado inteiro como UMA
 * imagem (com o ComposedChart REAL dentro) e colado numa página do PDF.
 */
export const RelatorioPdfLayout = forwardRef<
  HTMLDivElement,
  { data: AnaliseOperadorSerial; meta: IdentificacaoMeta }
>(function RelatorioPdfLayout({ data, meta }, ref) {
  const principais = data.principais;
  const excl = mesesExcluidos(data);
  const secMeio = Math.floor(data.secundarios.length / 2);

  return (
    <div ref={ref} className="pdf-doc-root" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Página 1 — Capa / Resumo ── */}
      <div data-pdf-page="1" className="sheet">
        <Header meta={meta} />
        <div className="op-strip">
          <div className="field">
            <div className="label">Operador</div>
            <div className="value">{meta.operador}</div>
          </div>
          <div className="field">
            <div className="label">Meses no período</div>
            <div className="value">{data.meses.length}</div>
          </div>
          <div className="field">
            <div className="label">Intervalo</div>
            <div className="value">{meta.intervalo}</div>
          </div>
        </div>

        <div className="section-label">Resumo executivo — KPIs principais</div>
        <table className="report-table">
          <thead>
            <tr>
              <th>KPI</th>
              <th>Média do período</th>
              <th>Meta</th>
              <th>Quartil (mês recente)</th>
              <th>Tendência</th>
            </tr>
          </thead>
          <tbody>
            {principais.map((serie) => {
              const media = mediaDe(serie.pontos);
              const ult = ultimoPlotado(serie.pontos);
              return (
                <tr key={serie.slug}>
                  <td className="kpi-name">{serie.displayName}</td>
                  <td className="num">
                    {media !== null
                      ? formatKpiValue(media, serie.valueType)
                      : "—"}
                  </td>
                  <td className="num">
                    {serie.metaLinha !== null
                      ? formatKpiValue(serie.metaLinha, serie.valueType)
                      : "—"}
                  </td>
                  <td>
                    <QuartilPill q={ult?.quartil ?? null} />
                  </td>
                  <td>
                    <TrendCell serie={serie} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {excl.length > 0 && (
          <div className="note-box">
            {excl.length} mês(es) excluído(s) do cálculo de média/quartil:{" "}
            {excl.map((e, i) => (
              <span key={e.label}>
                {i > 0 ? "; " : ""}
                <strong>
                  {e.label} — {e.motivo}
                </strong>
              </span>
            ))}
            .
          </div>
        )}

        <Footer meta={meta} n={1} />
      </div>

      {/* ── Página 2 — detalhe (principais 1 e 2) ── */}
      <div data-pdf-page="2" className="sheet">
        <Header meta={meta} />
        {principais.slice(0, 2).map((serie) => (
          <KpiBlock key={serie.slug} serie={serie} />
        ))}
        <Footer meta={meta} n={2} />
      </div>

      {/* ── Página 3 — detalhe (principais 3 e 4) ── */}
      <div data-pdf-page="3" className="sheet">
        <Header meta={meta} />
        {principais.slice(2, 4).map((serie) => (
          <KpiBlock key={serie.slug} serie={serie} />
        ))}
        <Footer meta={meta} n={3} />
      </div>

      {/* ── Página 4 — KPIs secundários ── */}
      <div data-pdf-page="4" className="sheet">
        <Header meta={meta} />
        <div className="section-label">
          KPIs secundários — valor do mês mais recente
        </div>
        <div className="sec-grid">
          <SecTable series={data.secundarios.slice(0, secMeio)} />
          <SecTable series={data.secundarios.slice(secMeio)} />
        </div>
        <Footer meta={meta} n={4} />
      </div>
    </div>
  );
});
