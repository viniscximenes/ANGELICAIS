"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MetaDirecao, MetaGestorConfig } from "@/lib/kpi/gestor/avaliar-meta-gestor";
import { KPI_GESTOR_CARDS } from "@/lib/kpi/gestor/kpi-gestor-cards-config";
import { saveKpiGestorMetasAction } from "@/lib/kpi/gestor/save-kpi-gestor-metas-action";
import { cn } from "@/lib/utils";

const DIRECAO_OPTIONS: { value: MetaDirecao; label: string }[] = [
  { value: null, label: "Sem meta" },
  { value: "gte", label: "≥ maior/igual" },
  { value: "lte", label: "≤ menor/igual" },
  { value: "forecast", label: "Forecast" },
  { value: "diff_bruta", label: "Diff. da bruta" },
];

interface KpiGestorMetasPopoverProps {
  metasIniciais: Record<string, MetaGestorConfig>;
  /** Chamado após salvar com sucesso — pai deve recarregar os dados exibidos. */
  onSaved: () => void;
}

export function KpiGestorMetasPopover({ metasIniciais, onSaved }: KpiGestorMetasPopoverProps) {
  const [open, setOpen] = useState(false);
  const [metas, setMetas] = useState(metasIniciais);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleOpenChange(next: boolean) {
    if (next) setMetas(metasIniciais);
    setOpen(next);
  }

  function updateDirecao(slug: string, direcao: MetaDirecao) {
    setMetas((prev) => ({
      ...prev,
      [slug]: { meta: prev[slug]?.meta ?? null, direcao },
    }));
  }

  function updateMeta(slug: string, valor: string) {
    setMetas((prev) => ({
      ...prev,
      [slug]: { meta: valor === "" ? null : valor, direcao: prev[slug]?.direcao ?? null },
    }));
  }

  function handleSave() {
    // Metas numéricas chegam como string do <input> — normaliza pro tipo
    // certo (número), exceto KPIs de tempo que ficam como texto "MM:SS".
    const normalizado: Record<string, MetaGestorConfig> = {};
    for (const card of KPI_GESTOR_CARDS) {
      const atual = metas[card.configSlug] ?? { meta: null, direcao: null };
      let meta = atual.meta;
      if (typeof meta === "string" && card.valueType !== "time") {
        const n = Number(meta);
        meta = meta.trim() === "" || Number.isNaN(n) ? null : n;
      }
      normalizado[card.configSlug] = { meta, direcao: atual.direcao };
    }

    startTransition(async () => {
      const result = await saveKpiGestorMetasAction(normalizado);
      if (result.success) {
        toast.success("Metas salvas");
        onSaved();
        setOpen(false);
      } else {
        toast.error("Erro ao salvar", { description: result.error });
      }
    });
  }

  return (
    <>
      {mounted &&
        createPortal(
          <div
            aria-hidden="true"
            onClick={() => handleOpenChange(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all duration-200",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />,
          document.body,
        )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Configurações de metas"
            aria-label="Configurações de metas"
            className="bg-primary text-primary-foreground hover:opacity-90 flex cursor-pointer items-center justify-center rounded-md p-2 shadow-sm transition-opacity disabled:opacity-50"
          >
            <IconSettings size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-[420px] rounded-xl border border-border p-4 shadow-xl bg-popover text-popover-foreground space-y-3"
        >
          <PopoverHeader className="pb-2 border-b border-border/50">
            <div>
              <PopoverTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <IconSettings size={15} className="text-muted-foreground" />
                Metas do Meu KPI
              </PopoverTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Defina a meta e a direção de cada indicador
              </p>
            </div>
          </PopoverHeader>

          <div className="space-y-1 max-h-96 overflow-y-auto pr-1 scrollbar-tema">
            {KPI_GESTOR_CARDS.map((card) => {
              const atual = metas[card.configSlug] ?? { meta: null, direcao: null };
              const isTempo = card.valueType === "time";
              const metaDesabilitada = atual.direcao === null || atual.direcao === "forecast";

              return (
                <div
                  key={card.configSlug}
                  className="grid grid-cols-[1fr_80px_130px] items-center gap-2 py-1 px-1 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground truncate" title={card.label}>
                    {card.label}
                  </span>
                  <Input
                    type={isTempo ? "text" : "number"}
                    step={isTempo ? undefined : "0.1"}
                    placeholder={isTempo ? "MM:SS" : "—"}
                    value={atual.meta ?? ""}
                    onChange={(e) => updateMeta(card.configSlug, e.target.value)}
                    disabled={metaDesabilitada}
                    className="h-7 px-2 text-xs font-mono bg-background border-border"
                  />
                  <select
                    value={atual.direcao ?? ""}
                    onChange={(e) =>
                      updateDirecao(card.configSlug, (e.target.value || null) as MetaDirecao)
                    }
                    className="h-7 rounded-md border border-border bg-background px-1 text-xs text-foreground focus:outline-none"
                  >
                    {DIRECAO_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value ?? ""}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs shadow-sm hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <IconCheck size={14} aria-hidden="true" />
                <span>Salvar Metas</span>
              </>
            )}
          </Button>
        </PopoverContent>
      </Popover>
    </>
  );
}
