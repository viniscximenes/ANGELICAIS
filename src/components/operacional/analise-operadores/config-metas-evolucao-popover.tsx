"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconLoader2, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MetaAnaliseKpi } from "@/lib/kpi/analise-operadores/metas-analise";
import { saveAnaliseMetasAction } from "@/lib/kpi/analise-operadores/save-metas-analise-action";
import { cn } from "@/lib/utils";

interface Props {
  /** Metas dos KPIs principais (Tx. Retenção Bruta, TMA, ABS, Indisp Total). */
  metas: MetaAnaliseKpi[];
  /** Chamado após salvar com sucesso, com as metas atualizadas. */
  onSaved: (metas: MetaAnaliseKpi[]) => void;
}

/** Segundos → "MM:SS". */
function formatarTempo(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** "13:00" → 780; "13" (só minutos) → 780. null se inválido. */
function lerTempo(texto: string): number | null {
  const partes = texto.trim().split(":");
  if (partes.length > 2) return null;
  const nums = partes.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
  if (nums.length === 1) return nums[0] * 60;
  const [m, s] = nums;
  if (s > 59) return null;
  return m * 60 + s;
}

function formatarMeta(meta: MetaAnaliseKpi, valor: number | null): string {
  if (valor === null) return "";
  return meta.valueType === "time" ? formatarTempo(valor) : String(valor);
}

/**
 * Engrenagem da linha de controles do cabeçalho de /kpi/evolucao (primeiro
 * item, mesma posição da engrenagem de /s/kpi/operadores), sempre ativa —
 * as metas são do gestor, não dependem de operador selecionado.
 *
 * Mesma casca do "Configurações de Metas" de /s/reports/consolidado
 * (config-metas-popover.tsx): overlay com blur, card w-72 rounded-2xl p-4
 * pt-3, título ds-h3 uppercase com divisória, linhas rótulo + campo e botão
 * "Salvar Alterações" cheio. Campos crus (tokens --seg-track, sem anel de
 * foco), mesmo padrão do "Buscar operador..." desta página.
 *
 * Campo vazio = usa a meta padrão do KPI (mostrada no placeholder). As
 * metas valem SÓ neste relatório (linha de meta e cor de status dos
 * cards) — não mudam kpi_definitions nem /s/kpi/operadores.
 */
export function ConfigMetasEvolucaoPopover({ metas, onSaved }: Props) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Portal só depois de montado no client (overlay cobre o viewport inteiro
  // mesmo com ancestrais com transform — PageTransition).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao abrir, descarta edição não salva e mostra os valores salvos.
  function handleOpenChange(next: boolean) {
    if (next) {
      setValores(
        Object.fromEntries(metas.map((m) => [m.slug, formatarMeta(m, m.override)])),
      );
    }
    setAberto(next);
  }

  function handleSalvar() {
    const payload: Record<string, number | null> = {};
    for (const m of metas) {
      const texto = (valores[m.slug] ?? "").trim();
      if (!texto) {
        payload[m.slug] = null;
        continue;
      }
      if (m.valueType === "time") {
        const seg = lerTempo(texto);
        if (seg === null) {
          toast.error(`${m.displayName}: informe no formato MM:SS`);
          return;
        }
        payload[m.slug] = seg;
      } else {
        const n = Number(texto.replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          toast.error(`${m.displayName}: informe um valor entre 0 e 100`);
          return;
        }
        payload[m.slug] = n;
      }
    }

    startTransition(async () => {
      const res = await saveAnaliseMetasAction(payload);
      if (res.success) {
        toast.success("Metas salvas");
        setAberto(false);
        onSaved(res.metas);
      } else {
        toast.error(res.error);
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
              aberto ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />,
          document.body,
        )}

      <Popover open={aberto} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Configurações de metas"
            className="font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-transparent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          >
            <IconSettings size={15} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          data-page="kpi-evolucao"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="bg-popover text-popover-foreground border-border z-[60] w-72 gap-0 rounded-2xl border p-4 pt-3 shadow-2xl"
        >
          <PopoverHeader className="border-border/50 border-b pb-2">
            <PopoverTitle className="ds-h3 font-semibold text-foreground uppercase">
              Configurações de Metas
            </PopoverTitle>
          </PopoverHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1">
              {metas.map((m) => {
                const id = `meta-evolucao-${m.slug}`;
                const tempo = m.valueType === "time";
                return (
                  <div
                    key={m.slug}
                    className="grid grid-cols-[1fr_92px] items-center gap-2 rounded-md px-1 py-1"
                  >
                    <label
                      htmlFor={id}
                      className="text-foreground truncate text-xs font-normal"
                      title={m.displayName}
                    >
                      {m.displayName}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id={id}
                        type="text"
                        inputMode={tempo ? "numeric" : "decimal"}
                        value={valores[m.slug] ?? ""}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [m.slug]: e.target.value }))
                        }
                        placeholder={formatarMeta(m, m.padrao) || (tempo ? "MM:SS" : "—")}
                        aria-label={`Meta de ${m.displayName}${tempo ? " (MM:SS)" : " (%)"}`}
                        className={cn(
                          "font-sans text-foreground placeholder:text-muted-foreground h-7 w-full rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] text-center text-xs font-semibold tabular-nums outline-none transition-colors",
                          tempo ? "px-2" : "pr-6 pl-2",
                        )}
                      />
                      {!tempo && (
                        <span className="text-muted-foreground pointer-events-none absolute right-2 text-[10px] font-bold">
                          %
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-muted-foreground px-1 text-[11px]">
              Campo vazio usa a meta padrão. Vale só neste relatório.
            </p>

            <Button
              type="button"
              onClick={handleSalvar}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold shadow-sm transition-colors"
            >
              {isPending ? (
                <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconCheck size={14} aria-hidden="true" />
              )}
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
