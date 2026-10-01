"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetaDirecao, MetaGestorConfig } from "@/lib/kpi/gestor/avaliar-meta-gestor";
import { KPI_GESTOR_CARDS } from "@/lib/kpi/gestor/kpi-gestor-cards-config";
import { saveKpiGestorMetasAction } from "@/lib/kpi/gestor/save-kpi-gestor-metas-action";

// Rótulos sem símbolo (≥/≤/</>) — mesma redação usada nos cards
// (avaliar-meta-gestor.ts: "mínimo X%"/"máximo X%"), pra ficar coerente com
// o que o gestor vê no card depois de fechar o modal.
const DIRECAO_OPTIONS: { value: MetaDirecao; selectLabel: string }[] = [
  { value: null, selectLabel: "Sem meta" },
  { value: "gte", selectLabel: "Mínimo" },
  { value: "lte", selectLabel: "Máximo" },
  { value: "forecast", selectLabel: "Forecast" },
  { value: "diff_bruta", selectLabel: "Diff. da bruta" },
];

/** value do Radix Select não aceita "" — usa um marcador só pra "Sem meta" (null). */
const SEM_META_VALUE = "__sem_meta__";

function direcaoParaSelectValue(direcao: MetaDirecao): string {
  return direcao ?? SEM_META_VALUE;
}

function selectValueParaDirecao(value: string): MetaDirecao {
  return value === SEM_META_VALUE ? null : (value as MetaDirecao);
}

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
    // Aceita vírgula decimal (ex. "14,5") — Number() sozinho não entende
    // vírgula, por isso troca por ponto antes de converter.
    const normalizado: Record<string, MetaGestorConfig> = {};
    for (const card of KPI_GESTOR_CARDS) {
      const atual = metas[card.configSlug] ?? { meta: null, direcao: null };
      let meta = atual.meta;
      if (typeof meta === "string" && card.valueType !== "time") {
        const n = Number(meta.trim().replace(",", "."));
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
      {/* Overlay com blur — mesmo padrão do popover de configuração de
          /kpi/operadores (config-kpi-operadores-popover.tsx). */}
      {mounted &&
        createPortal(
          <div
            aria-hidden="true"
            onClick={() => handleOpenChange(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all",
              // Entrada imediata (sem fade), saída mantém os 200ms.
              open ? "opacity-100 duration-0" : "pointer-events-none opacity-0 duration-200",
            )}
          />,
          document.body,
        )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Configurações de metas"
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] disabled:opacity-50"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        {/* Mesma casca/animação/tipografia do "Configurações das Colunas" de
            /kpi/operadores (config-kpi-operadores-popover.tsx): gap-0,
            p-4 pt-3, título ds-h3 uppercase, itens rounded-lg text-xs
            font-medium, sem auto-foco ao abrir. Largura maior que o w-80 de
            lá porque cada linha tem input + select. */}
        <PopoverContent
          data-page="kpi-gestor"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="font-sans bg-popover text-popover-foreground border-border w-[420px] max-w-[calc(100vw-2rem)] gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
            <PopoverHeader className="border-border/50 border-b pb-2">
              <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase whitespace-nowrap">
                Metas KPI Gestor
              </PopoverTitle>
            </PopoverHeader>

            {/* overscroll-contain: mesmo tratamento do painel de detalhes dos
                cards (kpi-gestor-card.tsx) — sem isso, ao chegar no fim da
                lista o resto do gesto de rolagem vaza pra rolar a página por
                trás do popover. */}
            <div className="space-y-1.5 pt-3 max-h-72 overflow-y-auto overscroll-contain pr-1 scrollbar-tema">
              {KPI_GESTOR_CARDS.map((card) => {
                const atual = metas[card.configSlug] ?? { meta: null, direcao: null };
                const isTempo = card.valueType === "time";
                const metaDesabilitada = atual.direcao === null || atual.direcao === "forecast";

                return (
                  <div
                    key={card.configSlug}
                    className="grid grid-cols-[1fr_76px_120px] items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium border border-border bg-transparent text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="truncate" title={card.label}>
                      {card.label}
                    </span>
                    <Input
                      type="text"
                      // inputMode "decimal" só pro numérico — teclado numérico
                      // com vírgula/ponto no celular; "text" pro tempo (MM:SS,
                      // tem ":"). Trocado de type="number" pra "text": em
                      // alguns navegadores um <input type="number"> rejeita
                      // vírgula na digitação mesmo com locale pt-BR — como
                      // texto livre, "14,5" sempre é aceito (normalizado pra
                      // "14.5" só na hora de salvar, ver handleSave).
                      inputMode={isTempo ? "text" : "decimal"}
                      placeholder={isTempo ? "MM:SS" : "—"}
                      value={atual.meta ?? ""}
                      onChange={(e) => updateMeta(card.configSlug, e.target.value)}
                      disabled={metaDesabilitada}
                      className="h-7 px-2 text-xs font-mono"
                    />
                    <Select
                      value={direcaoParaSelectValue(atual.direcao)}
                      onValueChange={(value) => updateDirecao(card.configSlug, selectValueParaDirecao(value))}
                    >
                      <SelectTrigger size="sm" className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent data-page="kpi-gestor">
                        {DIRECAO_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.selectLabel}
                            value={direcaoParaSelectValue(opt.value)}
                            className="text-xs"
                          >
                            {opt.selectLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 mt-3 border-t border-border/50">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="w-full h-9 rounded-lg border border-primary bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
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
            </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
