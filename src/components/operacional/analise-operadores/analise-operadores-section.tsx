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
  IconLoader2,
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
import { TX_RETENCAO_SLUG } from "@/lib/kpi/analise-operadores/constants";
import type {
  AnaliseOperadorSerial,
  KpisPreview,
} from "@/lib/kpi/analise-operadores/serial-types";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { SegmentedControl } from "@/app/(dashboard)/kpi/operadores/_components/segmented-control";

import { EstadoVazioOperador } from "./estado-vazio-operador";
import type { IdentificacaoMeta } from "./identificacao-bloco";
import { IdentificacaoBloco } from "./identificacao-bloco";
import { KpiPrincipalCard } from "./kpi-principal-card";
import { MetaTxRetencaoPopover } from "./meta-tx-retencao-popover";
import { KpiSecundariosGrid } from "./kpi-secundarios-grid";
import { RelatorioCarregando } from "./relatorio-carregando";

type Operador = { email: string; nome: string };

interface Props {
  operadores: Operador[];
  mesMaisRecenteDisponivel: string | null;
  gestorNome: string;
  kpisPreview: KpisPreview;
}

// Peso do título — mesma constante local duplicada em kpi-equipe-section.tsx
// (/kpi/operadores), kpi-gestor-section.tsx (/kpi/gestor) e
// kpi-detalhado-section.tsx (/kpi/detalhado-polo). Não é exportada de lá
// (função/consts locais daqueles arquivos, que não podem mudar).
const TITULO_WEIGHT_CLASS = "font-semibold";

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
            className="font-sans text-foreground placeholder:text-muted-foreground h-8 w-full rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] py-1.5 pr-3 pl-8 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
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
  // true SÓ enquanto a busca em andamento é de um operador NOVO (1ª seleção
  // ou troca) — ver efeito abaixo. Troca de período/"incluir mês atual" com
  // o MESMO operador continua usando só `isPending` (spinner pequeno no
  // cabeçalho, relatório atual permanece na tela) — comportamento
  // inalterado, não é o que esta tarefa pediu pra mudar.
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

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!operatorEmail) {
      ultimoOperatorEmailRef.current = null;
      setData(null);
      setErro(null);
      setCarregandoOperador(false);
      return;
    }

    const trocouDeOperador = ultimoOperatorEmailRef.current !== operatorEmail;
    ultimoOperatorEmailRef.current = operatorEmail;
    if (trocouDeOperador) setCarregandoOperador(true);

    startTransition(async () => {
      const res = await getAnaliseOperadorAction({
        operatorEmail,
        periodo,
        incluirMesAtual,
      });

      // Resultado de uma busca já superada por uma mais recente — descarta
      // (o request mais novo, em andamento ou já resolvido, é quem decide
      // o estado final).
      if (requestId !== requestIdRef.current) return;

      if (res.success) {
        setData(res.data);
        setErro(null);
        setGeradoEm(formatDateBR(new Date()));
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

  const meta: IdentificacaoMeta = {
    operador: nomeSelecionado,
    periodoLabel: PERIODO_LABELS[periodo],
    intervalo: data ? formatIntervaloMesRef(data.meses) : "—",
    mesesCount: data?.meses.length ?? 0,
    gestorNome,
    geradoEm,
  };

  const temRelatorio = Boolean(
    data && data.meses.length > 0 && data.principais.length > 0,
  );

  const periodoItems = PERIODO_VALUES.map((p) => ({
    value: p,
    label: PERIODO_LABELS[p],
  }));

  return (
    <div className="space-y-6">
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
          Linha de controles — mesma posição/altura (h-8) do MesSelector nas
          outras rotas. O seletor de operador só aparece aqui, como um
          "chip" (nome + ícone), QUANDO já existe operador selecionado — é
          o mesmo SeletorOperadorPopover do botão "Selecionar operador" do
          estado vazio (nunca os dois montados juntos: um exige
          operatorEmail null, o outro exige não-null), então nunca duplica.
          Fora isso, o cabeçalho segue com período (SegmentedControl
          genérico REAPROVEITADO de /kpi/operadores, mesmo padrão do
          MesSelector) e o switch "incluir mês atual", igual ao padrão de
          /kpi/operadores. Spinner de carregamento na extremidade direita,
          mesmo slot de ação das outras rotas.
        */}
        <div className="flex flex-wrap items-center gap-3 pt-4 pb-4">
          {operatorEmail && (
            <SeletorOperadorPopover
              trigger={
                <button
                  type="button"
                  aria-label={`Operador selecionado: ${nomeSelecionado}. Clique para trocar.`}
                  className="font-sans text-foreground hover:bg-muted/40 inline-flex h-8 min-w-[200px] items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                >
                  {/*
                    items-baseline (não items-center): o rótulo (11px) e o
                    nome (14px) têm alturas de linha bem diferentes —
                    centralizar pela CAIXA (items-center) deixa os dois
                    "flutuando" em alturas distintas, sem parecer a mesma
                    linha de base. Tamanho/tracking do rótulo alinhados ao
                    padrão já usado nos labels de IdentificacaoBloco
                    (text-[11px] tracking-wide uppercase text-muted-
                    foreground), não um tamanho à parte. min-w-0 no grupo:
                    sem ele, o `truncate` do nome não tem efeito nenhum
                    dentro de um flex item (que por padrão não encolhe
                    abaixo do conteúdo) — nome longo empurraria o botão em
                    vez de truncar.
                  */}
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
                      Operador
                    </span>
                    <span className="text-foreground truncate text-sm font-medium">
                      {nomeSelecionado}
                    </span>
                  </span>
                  <IconSelector
                    size={16}
                    className="text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
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
          )}

          <SegmentedControl
            items={periodoItems}
            value={periodo}
            onChange={(v) => setPeriodo(v as Periodo)}
            ariaLabel="Período"
            layoutId="evolucao-periodo-indicador"
          />

          <label className="flex h-8 cursor-pointer items-center gap-2 text-xs">
            <EvolucaoSwitch
              checked={incluirMesAtual}
              onCheckedChange={setIncluirMesAtual}
              ariaLabel="Incluir mês atual (ainda não fechado)"
            />
            <span className="text-muted-foreground">
              Incluir mês atual (ainda não fechado)
            </span>
          </label>

          {isPending && (
            <IconLoader2
              size={16}
              className="text-muted-foreground ml-auto animate-spin"
              aria-hidden="true"
            />
          )}
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
        <p className="text-muted-foreground text-sm">
          Ainda não há snapshots de KPI carregados no sistema.
        </p>
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
        <EstadoVazioOperador
          kpisPreview={kpisPreview}
          periodo={periodo}
          seletorOperador={
            <SeletorOperadorPopover
              trigger={
                <button
                  type="button"
                  className="font-sans border-border bg-background text-foreground hover:bg-muted/60 inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                >
                  <IconSelector size={15} aria-hidden="true" />
                  Selecionar operador
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
          }
        />
      )}

      {!carregandoOperador && erro && operatorEmail && (
        <p className="text-danger text-sm">{erro}</p>
      )}

      {!carregandoOperador &&
        operatorEmail &&
        !isPending &&
        !erro &&
        data &&
        data.meses.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Sem dados de KPI para <strong>{nomeSelecionado}</strong> no
            período selecionado.
          </p>
        )}

      {/* ── Relatório ─────────────────────────────────────────── */}
      {!carregandoOperador && temRelatorio && data && (
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
      )}
    </div>
  );
}
