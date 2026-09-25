"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveAnaliseMetaTxRetencaoAction } from "@/lib/kpi/analise-operadores/save-meta-tx-retencao-action";

interface Props {
  /** Meta efetiva hoje (override OU padrão). */
  metaAtual: number | null;
  ehOverride: boolean;
  /** Threshold de kpi_definitions — usado no botão "Usar padrão". */
  metaPadrao: number | null;
  /** Chamado após salvar/limpar com sucesso — o pai deve refazer o fetch. */
  onSaved: () => void;
}

/**
 * Engrenagem no card de Tx. Retenção Bruta: edita a meta usada SÓ neste
 * relatório (gestor_config_fantasia.analise_meta_tx_retencao). Não altera
 * kpi_definitions nem /kpi/operadores. É o ÚNICO KPI principal com essa
 * engrenagem/popover (os outros 3 — TMA, ABS, Indisponibilidade — não têm
 * meta editável nesta página); o ajuste abaixo vale só para esta única
 * instância.
 */
export function MetaTxRetencaoPopover({
  metaAtual,
  ehOverride,
  metaPadrao,
  onSaved,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState<string>(
    metaAtual !== null ? String(metaAtual) : "",
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    setValor(metaAtual !== null ? String(metaAtual) : "");
  }

  function salvar(novo: number | null) {
    startTransition(async () => {
      const res = await saveAnaliseMetaTxRetencaoAction(novo);
      if (res.success) {
        toast.success(
          novo === null ? "Meta voltou ao padrão" : "Meta salva",
        );
        setAberto(false);
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleSalvar() {
    const n = Number(valor.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast.error("Informe um valor entre 0 e 100");
      return;
    }
    salvar(n);
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) reset();
      }}
    >
      <PopoverTrigger asChild>
        {/*
          Mesmo visual da engrenagem de /kpi/operadores
          (_components/config-kpi-operadores-popover.tsx): botão cru, não o
          <Button variant="ghost"> compartilhado (sem borda, tamanho
          diferente) — h-8 w-8, border-border, bg-transparent,
          hover:bg-muted/40, ring temático no foco.
        */}
        <button
          type="button"
          aria-label="Configurar meta de retenção deste relatório"
          className={cn(
            "font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-transparent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
          )}
        >
          <IconSettings size={15} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      {/*
        Mesma casca visual do dropdown de operador (analise-operadores-
        section.tsx): rounded-2xl, border-border/80, shadow-2xl,
        backdrop-blur-md — consistente com o outro popover desta página
        (o padrão default de PopoverContent, mais estreito/reto, era o que
        estava aqui antes).
      */}
      <PopoverContent
        align="start"
        className="w-[260px] rounded-2xl border-border/80 bg-popover p-3.5 text-popover-foreground shadow-2xl backdrop-blur-md"
        data-page="kpi-evolucao"
      >
        <div className="space-y-1">
          <p className="font-sans text-foreground text-sm font-semibold">
            Meta de Tx. Retenção Bruta
          </p>
          <p className="font-sans text-muted-foreground text-xs">
            Vale só neste relatório — afeta a linha de meta e a cor de status
            deste card. Não muda /kpi/operadores.
          </p>
        </div>

        {/*
          Campo cru, mesmo padrão do "Buscar operador..." (tokens
          --seg-track/-track-border, não o <Input> compartilhado): aquele
          componente soma border-input + focus-visible:ring-3 do design
          system antigo, que aqui também rendia como contorno duplo/forte.
        */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={100}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={metaPadrao !== null ? String(metaPadrao) : "0–100"}
            aria-label="Meta de Tx. Retenção Bruta, em porcentagem"
            className="font-sans text-foreground placeholder:text-muted-foreground h-8 w-full rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--popover)]"
          />
          <span className="font-sans text-muted-foreground text-sm">%</span>
        </div>

        <p className="font-sans text-muted-foreground/80 mt-1.5 text-[11px]">
          {ehOverride
            ? `Atual: ${metaAtual}% (personalizado)`
            : `Atual: ${metaAtual ?? "—"}% (padrão)`}
        </p>

        {/*
          Hierarquia: "Usar padrão" como link discreto (variant="link", só
          texto) — ação secundária/reversível — e "Salvar" como botão cheio
          (variant default = bg-primary), a ação principal do popover.
        */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {ehOverride ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={isPending}
              onClick={() => salvar(null)}
            >
              Usar padrão
              {metaPadrao !== null ? ` (${metaPadrao}%)` : ""}
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSalvar}
          >
            {isPending && (
              <IconLoader2 className="animate-spin" aria-hidden="true" />
            )}
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
