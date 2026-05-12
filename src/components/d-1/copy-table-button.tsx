"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ResumoEquipe } from "@/lib/google/d1";

interface CopyTableButtonProps {
  equipe: ResumoEquipe;
}

export function CopyTableButton({ equipe }: CopyTableButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-equipe-table]");

    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      // Captura diretamente o elemento visível.
      // backgroundColor força fundo sólido (resolve transparência no Teams).
      const pngDataUrl = await toPng(target, {
        backgroundColor: "#15171c", // cinza escuro sólido, parecido com elevation-1
        pixelRatio: 2,
        cacheBust: true,
      });

      // Converte pra Blob
      const blobResponse = await fetch(pngDataUrl);
      const imageBlob = await blobResponse.blob();

      // Texto que acompanha (asteriscos = negrito em WhatsApp/Slack)
      const horaText =
        equipe.horaReport && equipe.horaReport !== "—"
          ? `Tabela do *CONSOLIDADO* até *${equipe.horaReport}*`
          : "Tabela do *CONSOLIDADO*";

      // HTML equivalente com <b> pra Teams/Gmail interpretarem negrito
      const htmlHora =
        equipe.horaReport && equipe.horaReport !== "—"
          ? `Tabela do <b>CONSOLIDADO</b> até <b>${equipe.horaReport}</b>`
          : `Tabela do <b>CONSOLIDADO</b>`;

      const htmlContent = `
        <div>
          <p>${htmlHora}</p>
          <img src="${pngDataUrl}" alt="Tabela CONSOLIDADO" />
        </div>
      `;

      const clipboardItem = new ClipboardItem({
        "image/png": imageBlob,
        "text/html": new Blob([htmlContent], { type: "text/html" }),
        "text/plain": new Blob([horaText], { type: "text/plain" }),
      });

      await navigator.clipboard.write([clipboardItem]);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole no Teams, Slack ou email (Ctrl+V)",
        duration: 2500,
      });

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-table] erro:", err);
      setState("idle");

      // Fallback: só imagem
      try {
        const pngDataUrl = await toPng(target, {
          backgroundColor: "#15171c",
          pixelRatio: 2,
        });
        const blobResponse = await fetch(pngDataUrl);
        const imageBlob = await blobResponse.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": imageBlob }),
        ]);
        toast.success("Imagem copiada");
      } catch {
        toast.error("Não foi possível copiar", {
          description: "Tente em outro navegador (Chrome/Edge)",
        });
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      disabled={state === "copying"}
      className="gap-2"
    >
      {state === "copying" && (
        <>
          <IconLoader2
            size={16}
            className="animate-spin"
            aria-hidden="true"
          />
          Gerando...
        </>
      )}
      {state === "done" && (
        <>
          <IconCheck
            size={16}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          Copiado
        </>
      )}
      {state === "idle" && (
        <>
          <IconCamera size={16} aria-hidden="true" />
          Copiar como imagem
        </>
      )}
    </Button>
  );
}
