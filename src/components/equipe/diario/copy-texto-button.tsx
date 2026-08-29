"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

/**
 * Botão de copiar o texto de UMA linha de report. `getTexto` é lido no
 * momento do clique — assim o template de Tempo Logado é copiado com o valor
 * atual da justificativa (ou com o placeholder, se ainda vazia).
 */
interface CopyTextoButtonProps {
  getTexto: () => string;
}

export function CopyTextoButton({ getTexto }: CopyTextoButtonProps) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopy() {
    const texto = getTexto();

    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallback pra navegadores sem permissão de clipboard async.
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopiado(true);
    toast.success("Report copiado", { duration: 1800 });
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copiar report"
      title="Copiar report"
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors"
    >
      {copiado ? (
        <IconCheck
          size={14}
          style={{ color: "var(--success)" }}
          aria-hidden="true"
        />
      ) : (
        <IconCopy size={14} aria-hidden="true" />
      )}
    </button>
  );
}
