"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 * kpi_definitions nem /kpi/operadores.
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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Configurar meta de retenção deste relatório"
        >
          <IconSettings aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px]">
        <div className="space-y-1">
          <p className="text-foreground text-sm font-medium">
            Meta de Tx. Retenção Bruta
          </p>
          <p className="text-muted-foreground text-xs">
            Vale só neste relatório — afeta a linha de meta e a cor de status
            deste card. Não muda /kpi/operadores.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={100}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="h-8"
            placeholder={metaPadrao !== null ? String(metaPadrao) : "0–100"}
          />
          <span className="text-muted-foreground text-sm">%</span>
        </div>

        <p className="text-muted-foreground/80 mt-1.5 text-[11px]">
          {ehOverride
            ? `Atual: ${metaAtual}% (personalizado)`
            : `Atual: ${metaAtual ?? "—"}% (padrão)`}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          {ehOverride ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
