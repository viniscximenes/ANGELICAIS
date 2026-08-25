"use client";

import { useState, useTransition } from "react";
import { IconCheck, IconDownload, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";

export function DownloadTableButton() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        const target = document.querySelector(
          "[data-equipe-png-wrapper]",
        ) as HTMLElement | null;
        if (!target) {
          toast.error("Tabela não encontrada");
          return;
        }

        const pngDataUrl = await capturarComoPng(target);

        const now = new Date();
        const dataStr = new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
          .format(now)
          .replace(/\//g, "-");
        const horaStr = new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
          .format(now)
          .replace(":", "h");

        const filename = `D1_Consolidado_${dataStr}_${horaStr}.png`;

        const link = document.createElement("a");
        link.href = pngDataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDone(true);
        toast.success("PNG baixado");
        setTimeout(() => setDone(false), 2500);
      } catch (e) {
        console.error("[download-table] erro:", e);
        toast.error("Erro ao baixar PNG");
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
      title="Baixar PNG em alta resolução. Arraste o arquivo pro Teams pra mostrar grande."
    >
      {isPending ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : done ? (
        <IconCheck
          size={14}
          style={{ color: "var(--success)" }}
          aria-hidden="true"
        />
      ) : (
        <IconDownload size={14} aria-hidden="true" />
      )}
      <span className="ds-mono-sm">
        {isPending ? "Baixando..." : done ? "Baixado" : "Baixar PNG"}
      </span>
    </button>
  );
}
