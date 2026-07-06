"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { IconCopy, IconCheck, IconSettings, IconChevronDown } from "@tabler/icons-react";
import { fetchContratosFiltradosAction } from "@/lib/retencao/actions";
import type { TemaData } from "@/lib/retencao/get-por-tema";
import { toast } from "sonner";

import type { OperadorItem } from "@/lib/retencao/get-por-operador";

interface CopiarContratosProps {
  escopo: "equipe" | "empresa";
  emailsEquipe: string[];
  porTema: TemaData[];
  porOperador: OperadorItem[];
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

  // Limpa a busca ao fechar ou abrir o menu
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
      <label className="text-[11px] font-medium text-muted-foreground uppercase block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left text-xs bg-zinc-900 border border-white/10 hover:border-white/20 rounded-lg p-2.5 text-foreground flex justify-between items-center transition-all shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer select-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || "Selecione..."}</span>
        <IconChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg shadow-xl max-h-56 overflow-y-auto scrollbar-tema py-1 flex flex-col">
          {/* Campo de pesquisa dentro do dropdown */}
          {searchable && (
            <div className="p-1.5 sticky top-0 bg-zinc-900 border-b border-white/5 z-10 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar operador..."
                className="w-full text-xs bg-zinc-950 border border-white/10 rounded-md p-1.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-40">
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
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CopiarContratos({ escopo, emailsEquipe, porTema, porOperador }: CopiarContratosProps) {
  const [selectedOperador, setSelectedOperador] = useState<string>("");
  const [status, setStatus] = useState<"todos" | "retido" | "cancelado">("todos");
  const [periodOption, setPeriodOption] = useState<"total" | "manha" | "tarde">("total");
  const [selectedMotivo, setSelectedMotivo] = useState<string>("");
  const [selectedSubmotivo, setSelectedSubmotivo] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [contratos, setContratos] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Mapeamentos de opções para os CustomSelects
  const operadoresOptions = useMemo(() => {
    if (escopo === "empresa") {
      const uniqueLogins = Array.from(new Set(porOperador.map((op) => op.login.toLowerCase().trim())));
      const list = uniqueLogins.map((login) => {
        const displayName = login.includes("@") ? login.split("@")[0] : login;
        return { value: login, label: displayName };
      });
      list.sort((a, b) => a.label.localeCompare(b.label));
      return [{ value: "", label: "Todos do polo" }, ...list];
    } else {
      const list = emailsEquipe.map((email) => {
        const displayName = email.includes("@") ? email.split("@")[0] : email;
        return { value: email, label: displayName };
      });
      list.sort((a, b) => a.label.localeCompare(b.label));
      return [{ value: "", label: "Todos da equipe" }, ...list];
    }
  }, [escopo, emailsEquipe, porOperador]);

  const statusOptions = [
    { value: "todos", label: "Todos" },
    { value: "retido", label: "Retidos" },
    { value: "cancelado", label: "Cancelados" },
  ];

  const periodOptions = [
    { value: "total", label: "Total" },
    { value: "manha", label: "Manhã" },
    { value: "tarde", label: "Tarde" },
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

  const submotivosOptions = useMemo(() => {
    if (!selectedMotivo) return [];
    const match = porTema.find((t) => t.motivo === selectedMotivo);
    const list = match ? match.submotivos.map((s) => ({ value: s.submotivo, label: s.submotivo })) : [];
    return [{ value: "", label: "Todos os submotivos" }, ...list];
  }, [selectedMotivo, porTema]);

  async function handleGerar() {
    setLoading(true);
    try {
      let periodo = { horaInicio: 0, horaFim: 23 };
      if (periodOption === "manha") {
        periodo = { horaInicio: 8, horaFim: 13 };
      } else if (periodOption === "tarde") {
        periodo = { horaInicio: 14, horaFim: 19 };
      }

      const result = await fetchContratosFiltradosAction({
        escopo,
        operador: selectedOperador || null,
        status,
        periodo,
        motivo: selectedMotivo || null,
        submotivo: selectedSubmotivo || null,
      });

      if (result.success && result.data) {
        setContratos(result.data);
        if (result.data.length === 0) {
          toast.info("Nenhum contrato encontrado com esses filtros.");
        }
      } else {
        toast.error(result.error || "Erro ao buscar contratos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao gerar contratos.");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = async () => {
    if (contratos.length === 0) return;
    const textToCopy = contratos.join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Contratos copiados para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao copiar contratos.");
    }
  };

  return (
    <div className="elevation-1 bg-card border border-border/60 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconSettings size={20} className="text-foreground" />
          Copiar Contratos
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Gere uma lista de códigos de contratos filtrados para copiar.
        </p>
      </div>

      <div className="space-y-3">
        {/* Filtro: Operador */}
        <CustomSelect
          label="Operador"
          value={selectedOperador}
          onChange={setSelectedOperador}
          options={operadoresOptions}
          searchable={true}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Filtro: Status */}
          <CustomSelect
            label="Status"
            value={status}
            onChange={(val) => setStatus(val as "todos" | "retido" | "cancelado")}
            options={statusOptions}
          />

          {/* Filtro: Período */}
          <CustomSelect
            label="Período"
            value={periodOption}
            onChange={(val) => setPeriodOption(val as "total" | "manha" | "tarde")}
            options={periodOptions}
          />
        </div>

        {/* Filtro: Motivo Principal */}
        <CustomSelect
          label="Motivo Principal"
          value={selectedMotivo}
          onChange={(val) => {
            setSelectedMotivo(val);
            setSelectedSubmotivo("");
          }}
          options={motivosOptions}
        />

        {/* Filtro: Submotivo */}
        {selectedMotivo && submotivosOptions.length > 0 && (
          <CustomSelect
            label="Submotivo"
            value={selectedSubmotivo}
            onChange={setSelectedSubmotivo}
            options={submotivosOptions}
          />
        )}

        <button
          onClick={handleGerar}
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/95 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Buscando contratos..." : "Filtrar Contratos"}
        </button>
      </div>

      {contratos.length > 0 && (
        <div className="space-y-2 border-t border-border/40 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-muted-foreground font-bold">
              {contratos.length} contrato{contratos.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleCopy}
              className="text-[11px] font-bold text-foreground hover:text-white flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <IconCheck size={14} className="text-success" />
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

          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3.5 font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap select-all shadow-inner">
            {contratos.join("\n")}
          </div>
        </div>
      )}
    </div>
  );
}
