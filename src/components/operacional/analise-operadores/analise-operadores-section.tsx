"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  IconChevronDown,
  IconLoader2,
  IconSelector,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  formatIntervaloMesRef,
  formatMesRefCurto,
} from "@/lib/kpi/analise-operadores/format-mes-ref";
import { getAnaliseOperadorAction } from "@/lib/kpi/analise-operadores/get-analise-operador-action";
import {
  PERIODO_LABELS,
  PERIODO_PADRAO,
  PERIODO_VALUES,
  type Periodo,
} from "@/lib/kpi/analise-operadores/periodo";
import { TX_RETENCAO_SLUG } from "@/lib/kpi/analise-operadores/constants";
import type { AnaliseOperadorSerial } from "@/lib/kpi/analise-operadores/serial-types";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils/format-datetime-br";

import { ExportPdfButton } from "./export-pdf-button";
import { ExportPngButton } from "./export-png-button";
import type { IdentificacaoMeta } from "./identificacao-bloco";
import { IdentificacaoBloco } from "./identificacao-bloco";
import { KpiPrincipalCard } from "./kpi-principal-card";
import { MetaTxRetencaoPopover } from "./meta-tx-retencao-popover";
import { KpiSecundariosGrid } from "./kpi-secundarios-grid";
import { RelatorioPdfLayout } from "./relatorio-pdf-layout";

type Operador = { email: string; nome: string };

interface Props {
  operadores: Operador[];
  mesMaisRecenteDisponivel: string | null;
  gestorNome: string;
}

function slugArquivo(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "operador"
  );
}

export function AnaliseOperadoresSection({
  operadores,
  mesMaisRecenteDisponivel,
  gestorNome,
}: Props) {
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_PADRAO);
  const [incluirMesAtual, setIncluirMesAtual] = useState(true);
  // Bump para forçar refetch após salvar a meta de retenção desta página.
  const [metaVersion, setMetaVersion] = useState(0);
  const [data, setData] = useState<AnaliseOperadorSerial | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const [popoverAberto, setPopoverAberto] = useState(false);
  const [busca, setBusca] = useState("");

  // Raiz do layout offscreen (tema claro) capturado por PNG e PDF.
  const pdfRef = useRef<HTMLDivElement>(null);

  const operadorSelecionado = operadores.find((o) => o.email === operatorEmail);
  const nomeSelecionado = operadorSelecionado?.nome ?? operatorEmail ?? "";

  useEffect(() => {
    if (!operatorEmail) {
      setData(null);
      setErro(null);
      return;
    }

    startTransition(async () => {
      const res = await getAnaliseOperadorAction({
        operatorEmail,
        periodo,
        incluirMesAtual,
      });
      if (res.success) {
        setData(res.data);
        setErro(null);
        setGeradoEm(formatDateTimeBR(new Date()));
      } else {
        setData(null);
        setErro(res.error);
        toast.error(res.error);
      }
    });
  }, [operatorEmail, periodo, incluirMesAtual, metaVersion]);

  const operadoresFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return operadores;
    return operadores.filter(
      (o) =>
        o.nome.toLowerCase().includes(q) || o.email.toLowerCase().includes(q),
    );
  }, [operadores, busca]);

  const meta: IdentificacaoMeta = {
    operador: nomeSelecionado,
    periodoLabel: PERIODO_LABELS[periodo],
    intervalo: data ? formatIntervaloMesRef(data.meses) : "—",
    mesesCount: data?.meses.length ?? 0,
    gestorNome,
    geradoEm,
  };

  const filenameBase = `analise_${slugArquivo(nomeSelecionado)}_${slugArquivo(
    PERIODO_LABELS[periodo],
  )}_${formatDateBR(new Date()).replace(/\//g, "-")}`;

  const temRelatorio = Boolean(
    data && data.meses.length > 0 && data.principais.length > 0,
  );

  return (
    <div className="space-y-6 py-6">
      {/* ── Controles ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="border-border bg-background hover:bg-muted flex min-w-[240px] items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors"
            >
              <span
                className={nomeSelecionado ? "text-foreground" : "text-muted-foreground"}
              >
                {nomeSelecionado || "Selecionar operador"}
              </span>
              <IconSelector
                size={16}
                className="text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px] p-2">
            <Input
              autoFocus
              placeholder="Buscar operador…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="mb-2 h-8"
            />
            <div className="scrollbar-tema max-h-[280px] overflow-y-auto">
              {operadoresFiltrados.length === 0 ? (
                <p className="text-muted-foreground px-2 py-3 text-xs">
                  Nenhum operador no roster corresponde.
                </p>
              ) : (
                operadoresFiltrados.map((o) => (
                  <button
                    key={o.email}
                    type="button"
                    onClick={() => {
                      setOperatorEmail(o.email);
                      setPopoverAberto(false);
                      setBusca("");
                    }}
                    className={`hover:bg-muted flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                      o.email === operatorEmail ? "bg-muted" : ""
                    }`}
                  >
                    <span className="text-foreground text-sm">{o.nome}</span>
                    <span className="text-muted-foreground ds-mono-sm text-[11px]">
                      {o.email}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Toggle de período */}
        <div className="bg-muted/30 border-border/30 flex w-fit rounded-lg border p-0.5">
          {PERIODO_VALUES.map((p) => {
            const ativo = periodo === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  ativo
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIODO_LABELS[p]}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isPending && (
            <IconLoader2
              size={16}
              className="text-muted-foreground animate-spin"
              aria-hidden="true"
            />
          )}
          <ExportPngButton
            targetRef={pdfRef}
            filenameBase={filenameBase}
            disabled={!temRelatorio || isPending}
          />
          <ExportPdfButton
            pagesRootRef={pdfRef}
            meta={meta}
            filenameBase={filenameBase}
            disabled={!temRelatorio || isPending}
          />
        </div>
      </div>

      {/* ── Linha auxiliar: incluir mês atual ─────────────────── */}
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs">
        <Switch
          checked={incluirMesAtual}
          onCheckedChange={setIncluirMesAtual}
          aria-label="Incluir mês atual (ainda não fechado)"
        />
        <span className="text-muted-foreground">
          Incluir mês atual (ainda não fechado)
        </span>
        {data && !incluirMesAtual && data.mesAtualTinhaDado && (
          <span className="text-muted-foreground/70">
            — {formatMesRefCurto(data.mesAtualRef)} oculto do gráfico, quartil e
            média
          </span>
        )}
      </label>

      {/* ── Estados ───────────────────────────────────────────── */}
      {!mesMaisRecenteDisponivel && (
        <p className="text-muted-foreground text-sm">
          Ainda não há snapshots de KPI carregados no sistema.
        </p>
      )}

      {mesMaisRecenteDisponivel && !operatorEmail && (
        <div className="border-border/60 text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-sm">
          <IconChevronDown size={16} aria-hidden="true" />
          Selecione um operador da sua equipe para ver o histórico de KPIs.
        </div>
      )}

      {erro && operatorEmail && (
        <p className="text-danger text-sm">{erro}</p>
      )}

      {operatorEmail && !isPending && !erro && data && data.meses.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Sem dados de KPI para <strong>{nomeSelecionado}</strong> no período
          selecionado.
        </p>
      )}

      {/* ── Relatório ─────────────────────────────────────────── */}
      {temRelatorio && data && (
        <>
          <div className="space-y-8">
            <IdentificacaoBloco meta={meta} />

            <div className="space-y-10">
              {data.principais.map((serie) => (
                <KpiPrincipalCard
                  key={serie.slug}
                  serie={serie}
                  acoes={
                    serie.slug === TX_RETENCAO_SLUG ? (
                      <MetaTxRetencaoPopover
                        metaAtual={data.metaTxRetencao}
                        ehOverride={data.metaTxRetencaoEhOverride}
                        metaPadrao={data.metaTxRetencaoPadrao}
                        onSaved={() => setMetaVersion((v) => v + 1)}
                      />
                    ) : undefined
                  }
                />
              ))}
            </div>

            <KpiSecundariosGrid series={data.secundarios} />
          </div>

          <RelatorioPdfLayout ref={pdfRef} data={data} meta={meta} />
        </>
      )}
    </div>
  );
}
