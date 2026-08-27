"use client";

import { useMemo, useState, useTransition } from "react";
import { IconClipboard, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { StyledCard } from "@/components/gestor/styled-card";
import { salvarPausasAction } from "@/lib/bases/pausas-programadas/actions/salvar-pausas-action";
import { parsePausasClipboard } from "@/lib/bases/pausas-programadas/parse-pausas-clipboard";
import { cn } from "@/lib/utils";

export function PausasPasteForm() {
  const router = useRouter();
  const [clipboardText, setClipboardText] = useState("");
  const [isPending, startTransition] = useTransition();

  const { linhas, ignoradas } = useMemo(
    () => parsePausasClipboard(clipboardText),
    [clipboardText],
  );

  function handleSalvar() {
    if (linhas.length === 0) {
      toast.error("Cole os dados primeiro");
      return;
    }

    startTransition(async () => {
      const result = await salvarPausasAction(linhas);

      if (result.success) {
        toast.success(`${result.total} operadores salvos`);
        setClipboardText("");
        router.refresh();
      } else {
        toast.error("Falha ao salvar", { description: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <StyledCard withGradient className="gap-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-2">
            <IconClipboard
              size={18}
              className="text-muted-foreground mt-0.5"
              aria-hidden="true"
            />
            <label htmlFor="pausas-textarea" className="ds-body font-medium block">
              COLAR PAUSAS PROGRAMADAS
            </label>
          </div>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={isPending || linhas.length === 0}
            className={cn(
              "bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer shadow-sm select-none disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{ fontSize: "12px" }}
          >
            {isPending && (
              <IconLoader2
                size={14}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            <span className="ds-mono-sm font-medium">
              {isPending ? "Processando..." : "Enviar dados"}
            </span>
          </button>
        </div>

        <textarea
          id="pausas-textarea"
          value={clipboardText}
          onChange={(e) => setClipboardText(e.target.value)}
          disabled={isPending}
          rows={4}
          placeholder=""
          className="ds-mono-sm elevation-2 w-full rounded-md px-3 py-2 bg-background text-foreground focus:outline-none"
          style={{
            border: "1px solid var(--border)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "12px",
            resize: "none",
            minHeight: "100px",
          }}
        />

        {ignoradas > 0 && (
          <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
            {ignoradas} linha{ignoradas === 1 ? "" : "s"} ignorada
            {ignoradas === 1 ? "" : "s"} (faltam agente, login ou logout).
          </p>
        )}
      </StyledCard>

      {linhas.length > 0 && (
        <div className="space-y-2">
          <p className="ds-small text-muted-foreground">
            Preview: {linhas.length} operador{linhas.length === 1 ? "" : "es"} detectado
            {linhas.length === 1 ? "" : "s"}
          </p>

          <StyledCard className="p-0 overflow-hidden" withGradient={false}>
            <div
              className="ds-mono-sm text-muted-foreground grid grid-cols-12 gap-3 border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="col-span-3">Agente</div>
              <div className="col-span-2">Célula</div>
              <div className="col-span-2">Login</div>
              <div className="col-span-2">Logout</div>
              <div className="col-span-1">D1</div>
              <div className="col-span-1">P20</div>
              <div className="col-span-1">D2</div>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {linhas.map((l) => (
                <div
                  key={l.operatorEmail}
                  className="grid grid-cols-12 items-center gap-3 border-b px-4 py-2 last:border-b-0 animate-in fade-in-0 duration-200"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="col-span-3 min-w-0">
                    <p className="ds-mono-sm truncate">{l.operatorEmail}</p>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="ds-mono-sm text-muted-foreground truncate">
                      {l.celula || "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="ds-mono-sm">{l.horaLogin || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="ds-mono-sm">{l.horaLogout || "—"}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="ds-mono-sm text-muted-foreground">
                      {l.descanso1 || "—"}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="ds-mono-sm text-muted-foreground">
                      {l.pausa20 || "—"}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="ds-mono-sm text-muted-foreground">
                      {l.descanso2 || "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </StyledCard>
        </div>
      )}
    </div>
  );
}
