"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  IconSearch,
  IconSelector,
} from "@tabler/icons-react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import type {
  AnaliseOperadorSerial,
  KpisPreview,
} from "@/lib/kpi/analise-operadores/serial-types";
import type { MetaAnaliseKpi } from "@/lib/kpi/analise-operadores/metas-analise";
import { SegmentedControl } from "@/app/(dashboard)/s/kpi/operadores/_components/segmented-control";

import { EstadoVazioOperador } from "./estado-vazio-operador";
import { KpiPrincipalCard } from "./kpi-principal-card";
import { ConfigMetasEvolucaoPopover } from "./config-metas-evolucao-popover";
import { KpiSecundariosGrid } from "./kpi-secundarios-grid";
import { RelatorioCarregando } from "./relatorio-carregando";

type Operador = { email: string; nome: string };

interface Props {
  operadores: Operador[];
  mesMaisRecenteDisponivel: string | null;
  gestorNome: string;
  kpisPreview: KpisPreview;
  /** Metas dos KPIs principais (override do gestor ?? padrão), carregadas no servidor. */
  metasIniciais: MetaAnaliseKpi[];
}

// Peso do título — mesma constante local duplicada em kpi-equipe-section.tsx
// (/kpi/operadores), kpi-gestor-section.tsx (/kpi/gestor) e
// kpi-detalhado-section.tsx (/kpi/detalhado-polo). Não é exportada de lá
// (função/consts locais daqueles arquivos, que não podem mudar).
const TITULO_WEIGHT_CLASS = "font-semibold";

// Duração mínima do skeleton ao trocar período/"incluir mês atual" — mesmo
// valor de MIN_TABELA_LOADING_MS em kpi-equipe-section.tsx (/kpi/operadores).
const MIN_SKELETON_MS = 2000;

/**
 * Switch local — Radix Switch usado diretamente com os tokens
 * `--switch-*` de kpi-evolucao.css, cópia do mesmo padrão de
 * LabeledSwitchControl em /kpi/operadores (_components/labeled-switch.tsx,
 * NÃO importado de lá por pedido explícito daquela rota: "essa rota não
 * deve depender de mudanças futuras no switch compartilhado, e vice-versa").
 * Não usa @/components/ui/switch.tsx (usado em todo o resto do site) — este
 * tem paleta própria (claro no escuro, escuro no claro), igual ao seletor
 * de período ao lado.
 */
function EvolucaoSwitch({
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className="relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-[var(--switch-off-border)] bg-[var(--switch-off)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--switch-on)]"
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3.5 translate-x-0.5 rounded-full bg-[var(--switch-knob-off)] shadow-sm transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-[15px] data-[state=checked]:bg-[var(--switch-knob)]" />
    </SwitchPrimitive.Root>
  );
}

/**
 * Popover de seleção de operador — busca + lista, extraído em componente
 * próprio pra ter só UMA instância no lugar certo em cada estado da
 * página: o botão "Selecionar operador" do estado vazio (EstadoVazioOperador)
 * e o "Trocar operador" do relatório (IdentificacaoBloco) são dois
 * TRIGGERS diferentes pro MESMO popover (mesma busca/lista/seleção) —
 * nunca os dois montados ao mesmo tempo, então nunca há dois seletores
 * visíveis na página (antes havia um fixo no cabeçalho + o do estado
 * vazio, duplicado).
 */
function SeletorOperadorPopover({
  trigger,
  aberto,
  onOpenChange,
  operadores,
  operatorEmail,
  busca,
  onBuscaChange,
  onSelecionar,
}: {
  trigger: ReactNode;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  operadores: Operador[];
  operatorEmail: string | null;
  busca: string;
  onBuscaChange: (busca: string) => void;
  onSelecionar: (email: string) => void;
}) {
  const operadoresFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return operadores;
    return operadores.filter(
      (o) =>
        o.nome.toLowerCase().includes(q) || o.email.toLowerCase().includes(q),
    );
  }, [operadores, busca]);

  return (
    <Popover open={aberto} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] rounded-2xl border-border/80 bg-popover p-2.5 text-popover-foreground shadow-2xl backdrop-blur-md"
        data-page="kpi-evolucao"
      >
        {/*
          Campo de busca — mesmo padrão da barra de pesquisa de
          /kpi/detalhado-polo (input cru com os tokens --seg-track/
          -track-border, não o <Input> compartilhado): aquele componente
          traz border-input + focus-visible:ring-3 do design system
          antigo, que aqui rendia como um contorno duplo/forte por cima
          das cores do tema novo.
        */}
        <div className="relative mb-2">
          <IconSearch
            size={14}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            autoFocus
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar operador..."
            aria-label="Buscar operador por nome ou e-mail"
            className="font-sans text-foreground placeholder:text-muted-foreground h-8 w-full rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] py-1.5 pr-3 pl-8 text-sm outline-none transition-colors"
          />
        </div>

        {/*
          Lista — mesmo padrão visual dos itens de
          ConfigKpiOperadoresPopover (_components/config-kpi-operadores-
          popover.tsx, /kpi/operadores): selecionado = bg-primary/
          text-primary-foreground (já resolve sozinho "escuro no claro,
          claro no escuro", porque --primary já é definido assim nos
          dois modos do tema — não precisa de tokens --seg-* aqui, que
          são só do toggle). Barra de rolagem: scrollbar-tema +
          overscroll-contain, mesmo ajuste usado no painel de
          /kpi/gestor (kpi-gestor-card.tsx).
        */}
        <div className="scrollbar-tema max-h-[280px] space-y-1 overflow-y-auto overscroll-contain pr-1">
          {operadoresFiltrados.length === 0 ? (
            <p className="text-muted-foreground px-2.5 py-3 text-xs">
              Nenhum operador no roster corresponde.
            </p>
          ) : (
            operadoresFiltrados.map((o) => (
              <button
                key={o.email}
                type="button"
                onClick={() => onSelecionar(o.email)}
                className={cn(
                  "w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--popover)]",
                  o.email === operatorEmail
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {o.nome}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Separador "·" do subtítulo — cópia do mesmo componente local usado nas
 *  outras 3 rotas já migradas (não exportado de lá). */
function SubtituloSeparador() {
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        marginInline: "0.5rem",
        color: "color-mix(in srgb, var(--muted-foreground) 60%, transparent)",
      }}
    >
      ·
    </span>
  );
}

export function AnaliseOperadoresSection({
  operadores,
  mesMaisRecenteDisponivel,
  gestorNome,
  kpisPreview,
  metasIniciais,
}: Props) {
  // Metas da engrenagem — atualizadas com o retorno do salvar.
  const [metas, setMetas] = useState<MetaAnaliseKpi[]>(metasIniciais);
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_PADRAO);
  const [incluirMesAtual, setIncluirMesAtual] = useState(true);
  // Bump para forçar refetch após salvar as metas desta página.
  const [metaVersion, setMetaVersion] = useState(0);
  const [data, setData] = useState<AnaliseOperadorSerial | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // true enquanto o skeleton (RelatorioCarregando) deve substituir o
  // relatório: troca de operador, de período ou do "incluir mês atual" —
  // ver efeito abaixo. Só o refetch após salvar a meta de retenção fica de
  // fora (usa apenas `isPending`, relatório atual permanece na tela).
  const [carregandoOperador, setCarregandoOperador] = useState(false);

  const [popoverAberto, setPopoverAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const operadorSelecionado = operadores.find((o) => o.email === operatorEmail);
  const nomeSelecionado = operadorSelecionado?.nome ?? operatorEmail ?? "";

  // Guarda de corrida: cada disparo do efeito ganha um id; só o resultado
  // do id MAIS RECENTE é aplicado ao estado. Sem isso, trocar de operador
  // várias vezes seguidas podia deixar a tela com o resultado de uma
  // escolha que não é mais a atual (quem resolve por último "ganha",
  // independente de qual foi pedido por último).
  const requestIdRef = useRef(0);
  // Email do operador da ÚLTIMA busca disparada — usado só para saber se a
  // busca atual é uma TROCA de operador (mostra RelatorioCarregando) ou uma
  // troca de período/toggle no mesmo operador (mantém o relatório atual,
  // só o spinner pequeno).
  const ultimoOperatorEmailRef = useRef<string | null>(null);
  // metaVersion da ÚLTIMA busca — refetch disparado só por salvar a meta de
  // retenção NÃO mostra skeleton (relatório atual permanece na tela).
  const ultimaMetaVersionRef = useRef(metaVersion);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!operatorEmail) {
      ultimoOperatorEmailRef.current = null;
      ultimaMetaVersionRef.current = metaVersion;
      setData(null);
      setErro(null);
      setCarregandoOperador(false);
      return;
    }

    const trocouDeOperador = ultimoOperatorEmailRef.current !== operatorEmail;
    const soMeta =
      !trocouDeOperador && ultimaMetaVersionRef.current !== metaVersion;
    ultimoOperatorEmailRef.current = operatorEmail;
    ultimaMetaVersionRef.current = metaVersion;

    // Troca de operador, de período (3/6/12) ou do "incluir mês atual":
    // skeleton da página (RelatorioCarregando). Nas duas últimas, mínimo de
    // 2s — mesmo padrão da troca de mês de /kpi/operadores
    // (MIN_TABELA_LOADING_MS em kpi-equipe-section.tsx).
    if (!soMeta) setCarregandoOperador(true);
    const minimoMs = !soMeta && !trocouDeOperador ? MIN_SKELETON_MS : 0;

    startTransition(async () => {
      const [res] = await Promise.all([
        getAnaliseOperadorAction({
          operatorEmail,
          periodo,
          incluirMesAtual,
        }),
        new Promise<void>((resolve) => window.setTimeout(resolve, minimoMs)),
      ]);

      // Resultado de uma busca já superada por uma mais recente — descarta
      // (o request mais novo, em andamento ou já resolvido, é quem decide
      // o estado final).
      if (requestId !== requestIdRef.current) return;

      if (res.success) {
        setData(res.data);
        setErro(null);
      } else {
        setData(null);
        setErro(res.error);
        toast.error(res.error);
      }
      setCarregandoOperador(false);
    });
  }, [operatorEmail, periodo, incluirMesAtual, metaVersion]);

  function selecionarOperador(email: string) {
    setOperatorEmail(email);
    setPopoverAberto(false);
    setBusca("");
  }

  const temRelatorio = Boolean(
    data && data.meses.length > 0 && data.principais.length > 0,
  );

  const periodoItems = PERIODO_VALUES.map((p) => ({
    value: p,
    label: PERIODO_LABELS[p],
  }));

  return (
    // space-y-2 + pb-2 da linha de controles = 16px até as cantoneiras,
    // mesmo respiro controles→tabela de /kpi/operadores (pb-2 + pt-2).
    <div className="space-y-2">
      {/*
        Cabeçalho — mesma estrutura de /kpi/operadores, /kpi/gestor e
        /kpi/detalhado-polo (kpi-equipe-section.tsx / kpi-gestor-section.tsx /
        kpi-detalhado-section.tsx): h1 + linha de contexto (aqui: gestor ·
        operador selecionado · período) + segunda linha com os controles que
        nas outras páginas é o MesSelector. O eyebrow "Painel do Gestor", a
        borda tracejada abaixo do título e o prefixo "/ Operação ·" saíram —
        texto herdado da rota antiga sem equivalente nas páginas de
        referência (nenhuma delas tem esse eyebrow nem essa borda).
      */}
      <div>
        <div className="pt-4">
          <h1
            className={cn(
              "font-sans text-3xl tracking-tight text-foreground md:text-4xl",
              TITULO_WEIGHT_CLASS,
            )}
          >
            Evolução
          </h1>
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {gestorNome}
            <SubtituloSeparador />
            {nomeSelecionado || "Nenhum operador selecionado"}
            <SubtituloSeparador />
            {PERIODO_LABELS[periodo]}
          </p>
        </div>

        {/*
          Linha de controles — mesmo layout de /kpi/operadores: à esquerda
          (slot das ações), o botão de seleção de operador (único seletor da
          página, com ou sem operador selecionado) + o switch "incluir mês
          atual"; à direita (slot do MesSelector), o período
          (SegmentedControl reaproveitado de lá). Todos com 32px de altura.
        */}
        <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
          {/* Esquerda: engrenagem (metas de Tx. Retenção Bruta, TMA, ABS e
              Indisp Total — mesma posição da engrenagem de
              /s/kpi/operadores, primeiro item da linha, sempre ativa) +
              operador + switch "incluir mês atual". */}
          <div className="flex flex-wrap items-center gap-3">
            <ConfigMetasEvolucaoPopover
              metas={metas}
              onSaved={(novas) => {
                setMetas(novas);
                setMetaVersion((v) => v + 1);
              }}
            />

            <SeletorOperadorPopover
              trigger={
                <button
                  type="button"
                  aria-label={
                    operatorEmail
                      ? `Operador selecionado: ${nomeSelecionado}. Clique para trocar.`
                      : "Selecionar operador"
                  }
                  className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 max-w-[260px] min-w-[140px] cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                >
                  {/* Mesma estrutura do "Copiar imagem" de /kpi/operadores:
                      ícone 14px + texto, gap-1.5, centralizado. */}
                  <IconSelector size={14} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">
                    {operatorEmail ? nomeSelecionado : "Selecionar operador"}
                  </span>
                </button>
              }
              aberto={popoverAberto}
              onOpenChange={setPopoverAberto}
              operadores={operadores}
              operatorEmail={operatorEmail}
              busca={busca}
              onBuscaChange={setBusca}
              onSelecionar={selecionarOperador}
            />

            <label className="font-sans text-muted-foreground inline-flex h-8 cursor-pointer items-center gap-2 text-sm font-medium select-none">
              <span>Incluir mês atual</span>
              <EvolucaoSwitch
                checked={incluirMesAtual}
                onCheckedChange={setIncluirMesAtual}
                ariaLabel="Incluir mês atual (ainda não fechado)"
              />
            </label>
          </div>

          {/*
            Direita: período. Com wrap, quebra pra
            linha de baixo e segue alinhado à direita (ml-auto por linha).
          */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="kpi-evolucao-periodo-selector">
              <SegmentedControl
                items={periodoItems}
                value={periodo}
                onChange={(v) => setPeriodo(v as Periodo)}
                ariaLabel="Período"
                layoutId="evolucao-periodo-indicador"
              />
            </div>
          </div>
        </div>

        {!carregandoOperador && data && !incluirMesAtual && data.mesAtualTinhaDado && (
          <p className="text-muted-foreground/70 -mt-2 pb-2 text-xs">
            Janela termina antes de {formatMesRefCurto(data.mesAtualRef)} (
            {formatIntervaloMesRef(data.meses)})
          </p>
        )}
      </div>

      {/* ── Estados ───────────────────────────────────────────── */}
      {!mesMaisRecenteDisponivel && (
        <EstadoVazioOperador
          kpisPreview={kpisPreview}
          periodo={periodo}
          mensagem="Ainda não há dados de KPI carregados"
          mensagemSr="Ainda não há snapshots de KPI carregados no sistema."
        />
      )}

      {/*
        `carregandoOperador` vem primeiro e SUBSTITUI totalmente o que
        estaria embaixo (estado vazio, relatório antigo ou mensagem de
        erro) — nunca aparece por cima nem ao lado do conteúdo anterior, e
        nunca com o relatório do operador ANTERIOR ainda visível: é por
        isso que existe (ver comentário no efeito de busca, acima).
      */}
      {mesMaisRecenteDisponivel && carregandoOperador && (
        <RelatorioCarregando
          kpisPreview={kpisPreview}
          periodo={periodo}
          nomeOperador={nomeSelecionado}
        />
      )}

      {/*
        Estado vazio (sem operador) — prévia "fantasma" na estrutura real
        da página (ver estado-vazio-operador.tsx). Substitui a caixa
        tracejada curta de antes; como o novo conteúdo já é bem mais alto
        (na prática, do tamanho de um relatório real), o min-height que
        aproximava a altura do esqueleto de loading não é mais necessário
        — removido.
      */}
      {mesMaisRecenteDisponivel && !carregandoOperador && !operatorEmail && (
        <EstadoVazioOperador kpisPreview={kpisPreview} periodo={periodo} />
      )}

      {!carregandoOperador && erro && operatorEmail && (
        <p className="text-danger text-sm">{erro}</p>
      )}

      {/* Operador sem dados no período: skeleton do relatório com o aviso
          sobre os gráficos (mesmo tratamento do estado sem operador), em vez
          de uma linha de texto solta. */}
      {mesMaisRecenteDisponivel &&
        !carregandoOperador &&
        operatorEmail &&
        !isPending &&
        !erro &&
        data &&
        !temRelatorio && (
          <EstadoVazioOperador
            kpisPreview={kpisPreview}
            periodo={periodo}
            mensagem={`Sem dados de ${nomeSelecionado} no período`}
            mensagemSr={`Sem dados de KPI para ${nomeSelecionado} no período selecionado.`}
          />
        )}

      {/* ── Relatório ─────────────────────────────────────────── */}
      {!carregandoOperador && temRelatorio && data && (
        <div className="space-y-8">
          <div className="space-y-10">
            {data.principais.map((serie) => (
              <KpiPrincipalCard
                key={serie.slug}
                serie={serie}
              />
            ))}
          </div>

          <KpiSecundariosGrid series={data.secundarios} />
        </div>
      )}
    </div>
  );
}
