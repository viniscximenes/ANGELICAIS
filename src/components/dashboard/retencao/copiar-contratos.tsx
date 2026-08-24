"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { IconCopy, IconCheck, IconFilter, IconChevronDown, IconTrash } from "@tabler/icons-react";
import { fetchContratosFiltradosAction } from "@/lib/retencao/actions";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import type { OperadorIndividual } from "@/lib/retencao/get-por-operador-individual";
import type { ContratoFiltradoItem } from "@/lib/retencao/get-contratos-filtrados";
import { formatNomeDotSobrenome } from "@/lib/gestor/derive-nome-operador";
import { StyledCard } from "@/components/gestor/styled-card";
import { toast } from "sonner";

interface CopiarContratosProps {
  emailsEquipe: string[];
  porTema: TemaData[];
  operadoresIndividual?: OperadorIndividual[];
}

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchable?: boolean;
}

function CustomSelect({ label, value, onChange, options, placeholder, searchable = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <div className="space-y-1 relative w-full" ref={dropdownRef}>
      <label className="text-[11px] font-medium text-muted-foreground uppercase block tracking-wider">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left text-xs bg-muted/20 border border-border/60 hover:border-border rounded-lg px-3 py-2.5 text-foreground flex justify-between items-center transition-all shadow-sm outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-border cursor-pointer select-none"
        style={{ outline: "none", boxShadow: "none" }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || "Selecione..."}</span>
        <IconChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto scrollbar-tema py-1">
          {searchable && (
            <div className="p-1.5 sticky top-0 bg-popover border-b border-border/40 z-10">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar operador..."
                className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-2.5 py-1.5 text-foreground outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-border/80"
                style={{ outline: "none", boxShadow: "none" }}
                autoFocus
              />
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic text-center">
              Nenhum operador encontrado
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors block truncate cursor-pointer ${
                  opt.value === value
                    ? "bg-primary text-primary-foreground font-semibold"
                    : opt.value === ""
                    ? "text-muted-foreground hover:text-foreground font-medium italic border-b border-border/20 mb-1"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function CopiarContratos({ emailsEquipe, porTema, operadoresIndividual }: CopiarContratosProps) {
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

    if (selectedOperador !== "") {
      return [{ value: "", label: "✕ Limpar seleção (Todos da equipe)" }, ...list];
    }

    return [{ value: "", label: "Todos da equipe" }, ...list];
  }, [emailsEquipe, operadoresIndividual, selectedOperador]);

  const statusOptions = [
    { value: "todos", label: "Todos" },
    { value: "retido", label: "Retidos" },
    { value: "cancelado", label: "Cancelados" },
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
          toast.info("Nenhum atendimento encontrado para a equipe com estes filtros.");
        } else {
          toast.success(`${result.data.length} registro(s) da equipe localizado(s)!`);
        }
      } else {
        toast.error(result.error || "Erro ao buscar registros da equipe.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao gerar registros.");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = async () => {
    if (contratos.length === 0) return;
    const textToCopy = contratos.map((c) => c.linhaFormatada).join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Registros copiados para a área de transferência!");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao copiar registros.");
    }
  };

  const handleLimparFiltros = () => {
    setSelectedOperador("");
    setStatus("todos");
    setSelectedMotivo("");
    setContratos([]);
    toast.info("Filtros limpos!");
  };

  return (
    <div className="space-y-3">
      {/* ── Título e descrição fora do card ─────────────────────────── */}
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconCopy size={20} className="text-foreground" />
          Copiar Contratos da Equipe
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Filtre e copie rapidamente a lista formatada (nome.sobrenome - status - motivo - contrato) da sua equipe.
        </p>
      </div>

      <StyledCard className="p-5 space-y-5" withGradient corners="all">
        {/* Filtros em Grade Única Responsiva */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Filtro: Operador da Equipe */}
          <CustomSelect
            label="Operador da Equipe"
            value={selectedOperador}
            onChange={setSelectedOperador}
            options={operadoresOptions}
            searchable={true}
          />

          {/* Filtro: Status */}
          <CustomSelect
            label="Status"
            value={status}
            onChange={(val) => setStatus(val as "todos" | "retido" | "cancelado")}
            options={statusOptions}
          />

          {/* Filtro: Motivo Principal */}
          <CustomSelect
            label="Motivo Principal"
            value={selectedMotivo}
            onChange={setSelectedMotivo}
            options={motivosOptions}
          />

          {/* Botão de Ação */}
          <button
            onClick={handleGerar}
            disabled={loading}
            className="py-2.5 px-5 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm h-[38px] w-full"
          >
            <IconFilter size={15} />
            {loading ? "Buscando..." : "Filtrar Contratos"}
          </button>
        </div>

        {/* Exibição dos Contratos Gerados no Formato: nome.sobrenome - status - motivo - contrato */}
        {contratos.length > 0 && (
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-mono text-foreground font-semibold">
                {contratos.length} contrato{contratos.length > 1 ? "s" : ""} localizado{contratos.length > 1 ? "s" : ""}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLimparFiltros}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 border border-border/50 flex items-center gap-1.5 cursor-pointer px-3.5 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                >
                  <IconTrash size={15} />
                  Limpar Filtro
                </button>

                <button
                  onClick={handleCopy}
                  className="text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg transition-all shadow-md active:scale-95"
                >
                  {copied ? (
                    <>
                      <IconCheck size={16} className="text-white" />
                      Copiado para a área de transferência!
                    </>
                  ) : (
                    <>
                      <IconCopy size={16} />
                      Copiar Todos
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-muted/20 border border-border/60 rounded-lg p-4 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-text shadow-inner">
              {contratos.map((c) => c.linhaFormatada).join("\n")}
            </div>
          </div>
        )}
      </StyledCard>
    </div>
  );
}
