"use client";

import { useState, useTransition } from "react";
import { IconChartLine, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";

export function CopyGraficoButton() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        const target = document.querySelector<HTMLElement>(
          "[data-grafico-png]",
        );
        if (!target) {
          toast.error("Gráfico não disponível ainda");
          return;
        }

        const pngDataUrl = await capturarComoPng(target);

        const response = await fetch(pngDataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);

        setDone(true);
        toast.success("Gráfico copiado", {
          description: "Cole no Teams, Slack ou email (Ctrl+V)",
          duration: 2500,
        });
        setTimeout(() => setDone(false), 2500);
      } catch (err) {
        console.error("[copy-grafico] erro:", err);
        toast.error("Não foi possível copiar", {
          description: "Tente em outro navegador (Chrome/Edge)",
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="elevation-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
      style={{ border: "1px solid var(--border)", fontSize: "12px" }}
      title="Copiar gráfico de evolução como imagem"
    >
      {isPending && (
        <>
          <IconLoader2
            size={14}
            className="animate-spin"
            aria-hidden="true"
          />
          <span className="ds-mono-sm">Copiando...</span>
        </>
      )}
      {done && (
        <>
          <IconCheck
            size={14}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <span className="ds-mono-sm">Copiado</span>
        </>
      )}
      {!isPending && !done && (
        <>
          <IconChartLine size={14} aria-hidden="true" />
          <span className="ds-mono-sm">Copiar gráfico</span>
        </>
      )}
    </button>
  );
}
