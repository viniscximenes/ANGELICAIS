"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { upsertPerUnitIndicatorAction } from "@/lib/rv/actions/upsert-per-unit-indicator";
import type { PerUnitFaixa, PerUnitIndicator } from "@/lib/rv/types";

interface Props {
  ruleSetId: string;
  indicator: PerUnitIndicator | null;
}

// Defaults usados quando ainda não existe um per-unit indicator (criação do
// zero). Hoje só temos uma mecânica: TX de retenção bruta × retidos derivados.
const DEFAULT_SLUG = "multiplicador_retido";
const DEFAULT_DISPLAY_NAME = "Multiplicador por Retido";
const DEFAULT_TX_KPI_SLUG = "tx_retencao_bruta";
const DEFAULT_COUNT_SOURCE = "derived_retido";

export function PerUnitIndicatorCard({ ruleSetId, indicator }: Props) {
  const router = useRouter();

  // O id é mantido em estado: ao criar do zero, o insert retorna o id novo e
  // os próximos saves viram update (em vez de duplicar a linha).
  const [id, setId] = useState<string | undefined>(indicator?.id);
  const [faixas, setFaixas] = useState<PerUnitFaixa[]>(
    indicator?.faixas ?? [{ threshold: 0, value: 0 }],
  );
  const [isPending, startTransition] = useTransition();

  const txKpiSlug = indicator?.txKpiSlug ?? DEFAULT_TX_KPI_SLUG;
  const countSource = indicator?.countSource ?? DEFAULT_COUNT_SOURCE;

  function updateFaixa(idx: number, field: "threshold" | "value", val: string) {
    const num = parseFloat(val.replace(",", "."));
    if (isNaN(num)) return;
    const newFaixas = [...faixas];
    newFaixas[idx] = { ...newFaixas[idx], [field]: num };
    setFaixas(newFaixas);
  }

  function addFaixa() {
    setFaixas([...faixas, { threshold: 0, value: 0 }]);
  }

  function removeFaixa(idx: number) {
    setFaixas(faixas.filter((_, i) => i !== idx));
  }

  function handleSave() {
    startTransition(async () => {
      const r = await upsertPerUnitIndicatorAction({
        id,
        ruleSetId,
        slug: indicator?.slug ?? DEFAULT_SLUG,
        displayName: indicator?.displayName ?? DEFAULT_DISPLAY_NAME,
        txKpiSlug,
        countSource,
        faixas,
        displayOrder: indicator?.displayOrder ?? 0,
      });
      if (r.success) {
        setId(r.id);
        toast.success("Salvo");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="elevation-1 space-y-4 rounded-xl p-5">
      <h3 className="ds-h2" style={{ fontSize: "1.15rem" }}>
        {indicator?.displayName ?? DEFAULT_DISPLAY_NAME}
      </h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            KPI da faixa (TX)
          </label>
          <input
            type="text"
            value="Tx Retenção Bruta"
            readOnly
            disabled
            className="elevation-2 ds-mono text-muted-foreground w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
        <div>
          <label className="ds-mono-sm text-muted-foreground mb-1 block">
            Fonte da contagem
          </label>
          <input
            type="text"
            value="Retidos (pedidos − churn)"
            readOnly
            disabled
            className="elevation-2 ds-mono text-muted-foreground w-full rounded-md px-3 py-2"
            style={{ border: "1px solid var(--border)" }}
          />
        </div>
      </div>

      <div>
        <p className="ds-mono-sm text-muted-foreground mb-2">
          Faixas (R$ por retido conforme a TX atingida)
        </p>
        <div className="space-y-2">
          {faixas.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="ds-mono-sm text-muted-foreground">
                A partir de
              </span>
              <input
                type="text"
                value={String(f.threshold)}
                onChange={(e) => updateFaixa(idx, "threshold", e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-20 rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
              />
              <span className="ds-mono-sm text-muted-foreground">% → R$</span>
              <input
                type="text"
                value={String(f.value)}
                onChange={(e) => updateFaixa(idx, "value", e.target.value)}
                disabled={isPending}
                className="elevation-2 ds-mono w-24 rounded-md px-3 py-2"
                style={{ border: "1px solid var(--border)" }}
              />
              <span className="ds-mono-sm text-muted-foreground">
                por retido
              </span>
              <button
                type="button"
                onClick={() => removeFaixa(idx)}
                disabled={isPending}
                className="text-muted-foreground hover:text-danger p-1 transition-colors"
                aria-label="Remover faixa"
              >
                <IconTrash size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addFaixa}
            disabled={isPending}
            className="ds-mono-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <IconPlus size={14} aria-hidden="true" />
            Adicionar faixa
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending && (
            <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
