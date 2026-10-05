"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconCopy, IconCheck, IconFilter, IconChevronDown, IconTrash, IconLoader2, IconSearch } from "@tabler/icons-react";
import { fetchContratosFiltradosAction } from "@/lib/retencao/actions";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { ContratoFiltradoItem } from "@/lib/retencao/get-contratos-filtrados";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { toast } from "sonner";
import { Segmentado } from "./segmentado";

interface CopiarContratosProps {
  emailsEquipe: string[];
  porTema: TemaData[];
  operadoresIndividual?: OperadorIndividual[];
  /**
   * Quando true, ocupa 100% da altura do container pai (que precisa ter
   * altura definida) e o card dimensiona pela altura real do conteúdo até
   * o teto (max-h-full) — sem esticar nem estourar. Usado dentro do trilho
   * horizontal de /s/reports/consolidado (retencao-horizontal-scroll.tsx).
   */
  scrollInterno?: boolean;
}

interface CustomSelectProps {
  label: string;
  /** Largura do campo (classe Tailwind) — default ocupa a coluna inteira. */
  className?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchable?: boolean;
}

function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu renderizado via portal em document.body (ver comentário acima do
  // return) — precisa recalcular a posição toda vez que abre, e reagir a
  // scroll/resize enquanto estiver aberto pra não descolar do botão.
  useEffect(() => {
    if (!isOpen) return;

    function updateRect() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchable, searchQuery]);

  return (
    <div className={`relative space-y-1.5 ${className ?? "w-full"}`} ref={triggerRef}>
      {/* Rótulo e campo no padrão do seletor "Ordenação Dos Operadores"
          (config-tabela-popover.tsx): rótulo text-xs medium sem caixa alta,
          campo com borda fina, sem hover e 32px de altura. */}
      <label className="text-foreground block text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border-border text-foreground flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border bg-transparent px-3 text-left text-sm font-medium outline-none select-none"
        style={{ outline: "none", boxShadow: "none" }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || "Selecione..."}</span>
        <IconChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/*
        Portal pra document.body: este select vive dentro do card
        "Copiar Contratos", que dentro do trilho horizontal de
        /s/reports/consolidado fica num slide com overflow-hidden (pra clipar
        os cards vizinhos durante o scroll-jacking). Sem portal, o menu
        (position: absolute local) seria cortado por esse overflow-hidden
        assim que abrisse. Posição calculada via getBoundingClientRect do
        próprio botão (position: fixed, não relativa a nenhum ancestral).
      */}
      {isOpen && menuRect &&
        createPortal(
          // Mesmo desenho da lista do seletor "Ordenação Dos Operadores"
          // (config-tabela-popover.tsx): caixa com respiro interno (p-1),
          // opções arredondadas e a selecionada em bg-primary com ✓. A busca
          // fica fixa no topo; só a lista de opções rola.
          <div
            ref={menuRef}
            data-page="reports-consolidado"
            className="bg-popover text-popover-foreground border-border fixed z-[100] flex max-h-64 flex-col overflow-hidden rounded-lg border shadow-2xl"
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
          >
            {searchable && (
              <div className="border-border/50 flex shrink-0 items-center gap-2 border-b px-3">
                <IconSearch size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar operador..."
                  className="copiar-contratos-busca text-foreground placeholder:text-muted-foreground h-9 w-full bg-transparent text-xs outline-none"
                  style={{ outline: "none", boxShadow: "none" }}
                  autoFocus
                />
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-1 scrollbar-tema">
              {filteredOptions.length === 0 ? (
                <div className="text-muted-foreground px-3 py-2 text-center text-xs italic">
                  Nenhum operador encontrado
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const selecionado = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                        selecionado
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {selecionado && <IconCheck size={14} className="shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function CopiarContratos({
  emailsEquipe,
  porTema,
  operadoresIndividual,
  scrollInterno = false,
}: CopiarContratosProps) {
  const [selectedOperador, setSelectedOperador] = useState<string>("");
  const [status, setStatus] = useState<"todos" | "retido" | "cancelado">("todos");
  const [selectedMotivo, setSelectedMotivo] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [contratos, setContratos] = useState<ContratoFiltradoItem[]>([]);
  const [copied, setCopied] = useState(false);

  // Lista TODOS os operadores da equipe, independente de total/tx estarem
  // zerados no período — o dropdown é só uma seleção de "quem filtrar",
  // não uma exibição de métricas. Filtrar por "tem dado" aqui zerava a
  // lista inteira sempre que a equipe toda estava com métricas zeradas
  // (ex: período sem atendimentos ainda), mesmo a equipe existindo — a
  // tabela Equipe do Consolidado não filtra assim, mostra todos com "0".
  const operadoresOptions = useMemo(() => {
    let list: { value: string; label: string }[] = [];

    if (operadoresIndividual && operadoresIndividual.length > 0) {
      list = operadoresIndividual.map((op) => {
        const email = op.login;
        // Nome vem SEMPRE do login (mesma fonte da tabela Equipe e de
        // OperadoresLista) — op.nomeBanco é texto cru importado junto com
        // os atendimentos, pode estar desatualizado/sujo (ex: "caio.silva"
        // quando o login atual é "caio.vsilva"), ou até em branco.
        const displayName = formatNomeDotSobrenome(email);
        return { value: email, label: displayName };
      });
    } else {
      list = emailsEquipe.map((email) => {
        const displayName = formatNomeDotSobrenome(email);
        return { value: email, label: displayName };
      });
    }

    list.sort((a, b) => a.label.localeCompare(b.label));

    // Sempre "Todos da equipe" — com a opção selecionada marcada por ✓,
    // o rótulo "✕ Limpar seleção" deixou de ser necessário.
    return [{ value: "", label: "Todos da equipe" }, ...list];
  }, [emailsEquipe, operadoresIndividual]);

  const statusOptions: { valor: "todos" | "retido" | "cancelado"; rotulo: string }[] = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "retido", rotulo: "Retidos" },
    { valor: "cancelado", rotulo: "Cancelados" },
  ];

  const motivosOptions = useMemo(() => {
    const defaultMotivos = [
      "Mud. Endereço",
      "Mot. Financeiro",
      "Ins. Atendimento",
      "Ins. Serviço",
      "Mud. Provedora",
      "Outros"
    ];
    const uniqueMotivos = Array.from(new Set([
      ...defaultMotivos,
      ...porTema.map((t) => t.motivo)
    ]));
    const list = uniqueMotivos.map((m) => ({ value: m, label: m }));
    return [{ value: "", label: "Todos os motivos" }, ...list];
  }, [porTema]);

  async function handleGerar() {
    setLoading(true);
    try {
      const result = await fetchContratosFiltradosAction({
        operador: selectedOperador || null,
        status,
        periodo: { horaInicio: 0, horaFim: 23 },
        motivo: selectedMotivo || null,
        submotivo: null,
      });

      if (result.success && result.data) {
        setContratos(result.data);
        if (result.data.length === 0) {
          toast.info("Nenhum atendimento encontrado para a equipe com estes filtros.", {
            className: "reports-consolidado-toast",
          });
        }
        // Sem toast de sucesso: a contagem ("N contratos localizados") já
        // aparece acima da tabela.
      } else {
        toast.error(result.error || "Erro ao buscar registros da equipe.", {
          className: "reports-consolidado-toast",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao gerar registros.", { className: "reports-consolidado-toast" });
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = async () => {
    if (contratos.length === 0) return;
    const textToCopy = contratos.map((c) => c.linhaFormatada).join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      // Sem toast de sucesso: o próprio botão já confirma ("Copiado!").
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao copiar registros.", { className: "reports-consolidado-toast" });
    }
  };

  const handleLimparFiltros = () => {
    setSelectedOperador("");
    setStatus("todos");
    setSelectedMotivo("");
    // Sem toast: a lista some e os filtros voltam ao padrão na hora.
    setContratos([]);
  };

  return (
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      {/* ── Título e descrição fora do card ─────────────────────────── */}
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground">
          Copiar contratos do AIR
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Escolha operador, motivo e status para listar os contratos da equipe. Depois é só
          copiar e colar: sai um contrato por linha.
        </p>
      </div>

      {/*
        scrollInterno: SEM flex-1/h-full — dimensiona pela altura real do
        conteúdo (filtros + resultado, quando houver), só limitado por
        max-h-full (teto herdado do wrapper pai). Mesmo padrão já aplicado
        em tabela-temas.tsx/distribuicao-quartis.tsx.
      */}
      <div
        className={scrollInterno ? "max-h-full overflow-y-auto scrollbar-tema space-y-5" : "space-y-5"}
      >
        {/* Filtros numa linha (quebra em telas estreitas), todos com 32px
            de altura e alinhados pela base: Operador / Motivo na extremidade
            esquerda, Status / Filtrar Contratos na extremidade direita. */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <CustomSelect
              label="Operador"
              value={selectedOperador}
              onChange={setSelectedOperador}
              options={operadoresOptions}
              searchable={true}
              className="w-full sm:w-56"
            />

            <CustomSelect
              label="Motivo"
              value={selectedMotivo}
              onChange={setSelectedMotivo}
              options={motivosOptions}
              className="w-full sm:w-48"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <span className="text-foreground block text-sm font-medium">Status</span>
              <Segmentado
                ariaLabel="Status do contrato"
                grupo="copiar-contratos-status"
                opcoes={statusOptions}
                valor={status}
                onChange={setStatus}
                tamanho="grande"
              />
            </div>

            {/* Mesmo visual do "Salvar Alterações" dos cards de configuração. */}
            <button
              onClick={handleGerar}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
            >
              {loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconFilter size={14} />}
              {loading ? "Buscando..." : "Filtrar Contratos"}
            </button>
          </div>
        </div>

        {/* Exibição dos Contratos Gerados no Formato: nome.sobrenome - status - motivo - contrato */}
        {contratos.length > 0 && (
          // Largura toda: contagem à esquerda, Limpar Filtro / Copiar Todos
          // na extremidade direita (acima da coluna MOTIVO).
          <div className="space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="text-foreground text-sm">
                  <span className="font-semibold">{contratos.length}</span> contrato{contratos.length > 1 ? "s" : ""} localizado{contratos.length > 1 ? "s" : ""}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Copiado no formato: Contrato - Operador - Status - Motivo
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLimparFiltros}
                  className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                >
                  <IconTrash size={14} />
                  Limpar Filtro
                </button>

                <button
                  onClick={handleCopy}
                  disabled={contratos.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
                >
                  {copied ? (
                    <>
                      <IconCheck size={14} />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} />
                      Copiar Todos
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tabela no padrão das demais do Analítico (cabeçalho igual ao
                da tabela principal via data-tabela-contratos em
                reports-consolidado.css), na MESMA ordem da linha copiada:
                Contrato - Operador - Status - Motivo. */}
            {/* Tabela na largura toda, então a barra de rolagem fica colada
                na borda direita da tabela. */}
            <div className="max-h-72 overflow-auto scrollbar-tema">
              {/* Largura toda: CONTRATO na extremidade esquerda e OPERADOR /
                  STATUS / MOTIVO juntos na extremidade direita — a coluna
                  vazia do meio (sem largura fixa) absorve a sobra. Títulos e
                  dados centralizados em cada coluna; status sem cor. */}
              <table data-tabela-contratos className="w-full border-collapse text-center">
                {/* bg-background: o fundo do cabeçalho no escuro é
                    translúcido — fixo no topo, as linhas apareceriam por trás. */}
                <thead className="bg-background sticky top-0 z-10">
                  <tr className="select-none">
                    <th className="w-[130px] py-2.5 px-4 text-center whitespace-nowrap">Contrato</th>
                    <th aria-hidden="true" />
                    <th className="w-[190px] py-2.5 px-4 text-center whitespace-nowrap">Operador</th>
                    <th className="w-[120px] py-2.5 px-4 text-center whitespace-nowrap">Status</th>
                    <th className="w-[260px] py-2.5 px-4 text-center whitespace-nowrap">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-border/30 divide-y select-text">
                  {contratos.map((c) => (
                    <tr key={`${c.usuarioLogin}-${c.codAir}`} className="align-middle">
                      <td
                        className="text-foreground py-2.5 px-4 text-sm font-medium"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {c.codAir}
                      </td>
                      <td aria-hidden="true" />
                      <td className="text-foreground py-2.5 px-4 text-sm">{c.nomeSobrenome}</td>
                      <td className="text-foreground py-2.5 px-4 text-sm">{c.status}</td>
                      <td className="text-muted-foreground py-2.5 px-4 text-[13px] whitespace-nowrap">{c.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
