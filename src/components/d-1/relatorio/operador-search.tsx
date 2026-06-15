"use client";

import { useMemo, useState } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";

import type { OperadorConsolidado } from "@/lib/google/d1";

const MAX_RESULTS = 8;

function operadorLabel(email: string): string {
  return email.split("@")[0] || email;
}

interface OperadorSearchProps {
  /** Lista COMPLETA da empresa (todas as equipes), não só a do supervisor atual. */
  operadores: OperadorConsolidado[];
  termo: string;
  onTermoChange: (termo: string) => void;
  operadorSelecionado: OperadorConsolidado | null;
  onSelect: (operador: OperadorConsolidado) => void;
  onClear: () => void;
}

export function OperadorSearch({
  operadores,
  termo,
  onTermoChange,
  operadorSelecionado,
  onSelect,
  onClear,
}: OperadorSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filtra por nome (derivado do email) E email, case-insensitive e parcial.
  const resultados = useMemo(() => {
    const q = termo.trim().toLowerCase();
    if (!q) return [];
    return operadores
      .filter((op) => {
        const nome = operadorLabel(op.email).toLowerCase();
        return nome.includes(q) || op.email.toLowerCase().includes(q);
      })
      .slice(0, MAX_RESULTS);
  }, [operadores, termo]);

  const temBusca = operadorSelecionado !== null || termo.trim() !== "";
  // Só mostra a lista enquanto o usuário ainda não fixou um operador.
  const mostrarLista =
    isOpen && operadorSelecionado === null && resultados.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="operador-search"
        className="ds-mono-sm text-muted-foreground tracking-wider uppercase"
      >
        Buscar operador
      </label>

      <div style={{ position: "relative", minWidth: "320px", maxWidth: "100%" }}>
        <IconSearch
          size={16}
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          id="operador-search"
          type="text"
          value={termo}
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar operador em toda a empresa..."
          onChange={(e) => {
            onTermoChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          // Pequeno delay pra o clique num resultado acontecer antes do fechamento.
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          className="elevation-2 ds-body w-full rounded-md py-2"
          style={{
            border: "1px solid var(--border)",
            paddingLeft: "36px",
            paddingRight: temBusca ? "36px" : "12px",
          }}
        />
        {temBusca && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Limpar busca"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 transition-colors"
          >
            <IconX size={16} aria-hidden="true" />
          </button>
        )}

        {mostrarLista && (
          <ul
            role="listbox"
            className="elevation-2 absolute z-50 mt-1 w-full overflow-auto rounded-md py-1"
            style={{ border: "1px solid var(--border)", maxHeight: "320px" }}
          >
            {resultados.map((op) => (
              <li key={op.email}>
                <button
                  type="button"
                  // onMouseDown impede o blur de fechar a lista antes do onClick.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(op);
                    setIsOpen(false);
                  }}
                  className="hover:bg-accent flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors"
                >
                  <span className="ds-body text-foreground">
                    {operadorLabel(op.email)}
                  </span>
                  <span className="ds-mono-sm text-muted-foreground">
                    {op.email}
                  </span>
                  <span className="ds-mono-sm text-muted-foreground">
                    {op.supervisor || "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
