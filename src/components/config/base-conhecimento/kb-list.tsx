"use client";

import { useMemo, useState } from "react";
import { IconPlus, IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import type { KbArtigo, KbTipo } from "@/lib/kb/types";

import { ArtigoModal } from "./artigo-modal";
import { KbArtigoRow } from "./kb-artigo-row";

interface Props {
  tipo: KbTipo;
  artigos: KbArtigo[];
  title: string;
  description: string;
  addLabel: string;
  showSearch?: boolean;
  emptyLabel: string;
}

export function KbList({
  tipo,
  artigos,
  title,
  description,
  addLabel,
  showSearch = false,
  emptyLabel,
}: Props) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artigos;
    return artigos.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        a.palavrasChave.some((termo) => termo.toLowerCase().includes(q)),
    );
  }, [artigos, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="ds-h3">{title}</h2>
          <p className="ds-small text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="gap-2"
        >
          <IconPlus size={16} aria-hidden="true" />
          {addLabel}
        </Button>
      </div>

      {showSearch && (
        <div className="relative max-w-sm">
          <IconSearch
            size={16}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou palavra-chave..."
            className="elevation-2 ds-body w-full rounded-md py-2 pr-3 pl-9"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="elevation-1 rounded-xl p-8 text-center">
          <p className="ds-body text-muted-foreground">
            {artigos.length === 0 ? emptyLabel : "Nada encontrado"}
          </p>
        </div>
      ) : (
        <div className="elevation-1 overflow-hidden rounded-xl">
          {filtered.map((artigo) => (
            <KbArtigoRow key={artigo.id} artigo={artigo} />
          ))}
        </div>
      )}

      <ArtigoModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultTipo={tipo}
      />
    </div>
  );
}
