"use client";

import { useMemo, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import type { OperadorContratos } from "@/lib/google/d1";
import { ContratoItem } from "./contrato-item";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface ContratosSectionProps {
  contratos: OperadorContratos | null;
}

export function ContratosSection({ contratos }: ContratosSectionProps) {
  const [view, setView] = useState<"cancelados" | "retidos">("cancelados");
  const [search, setSearch] = useState("");

  const list = useMemo(() => contratos?.[view] ?? [], [contratos, view]);

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.cliente.toLowerCase().includes(q) ||
        item.contrato.toLowerCase().includes(q),
    );
  }, [list, search]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="divider-gradient flex-1" />
        <span className="ds-mono-sm text-muted-foreground">◆</span>
        <div className="divider-gradient flex-1" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="ds-mono text-muted-foreground">02</span>
          <span className="ds-mono text-muted-foreground">·</span>
          <h2 className="ds-h2">Contratos</h2>
        </div>

        <div className="elevation-1 inline-flex gap-1 rounded-md p-1">
          <button
            onClick={() => setView("cancelados")}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              view === "cancelados"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            Cancelados
          </button>
          <button
            onClick={() => setView("retidos")}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              view === "retidos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            Retidos
          </button>
        </div>
      </div>

      <div className="relative">
        <IconSearch
          size={16}
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          type="text"
          placeholder="Buscar por nome do cliente ou contrato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="elevation-1 rounded-lg p-12 text-center">
          <p className="ds-body text-muted-foreground">
            {list.length === 0
              ? `Sem contratos ${view === "cancelados" ? "cancelados" : "retidos"} hoje`
              : "Nenhum contrato encontrado para essa busca"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((item, idx) => (
            <ContratoItem
              key={`${view}-${item.contrato}-${idx}`}
              cliente={item.cliente}
              contrato={item.contrato}
              view={view}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}
