"use client";

import { useState } from "react";
import { IconCheck, IconDownload, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { capturarComoPng } from "@/lib/utils/capturar-como-png";

interface ExportPngButtonProps {
  /** Wrapper visível do relatório (marcado com data-analise-png). */
  targetRef: React.RefObject<HTMLDivElement | null>;
  /** Nome do arquivo sem extensão (nome fantasia já resolvido). */
  filenameBase: string;
  disabled?: boolean;
}

/**
 * Baixa o relatório inteiro como PNG — mesmo `capturarComoPng` do resto do
 * site (não um novo padrão), capturando o componente real theme-aware.
 * Download (não clipboard): este relatório é documento de registro.
 */
export function ExportPngButton({
  targetRef,
  filenameBase,
  disabled,
}: ExportPngButtonProps) {
  const [state, setState] = useState<"idle" | "gerando" | "feito">("idle");

  async function handleClick() {
    const target = targetRef.current;
    if (!target) {
      toast.error("Relatório não encontrado");
      return;
    }

    setState("gerando");
    try {
      // Deixa os gráficos assentarem antes de capturar.
      await new Promise((r) => setTimeout(r, 450));
      // padding 0: o wrapper offscreen (data-theme="light") já tem respiro
      // interno e fundo claro próprio — o padding padrão de capturarComoPng
      // usaria o --background do tema da SESSÃO (possivelmente escuro).
      const dataUrl = await capturarComoPng(target, { scale: 2, padding: 0 });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filenameBase}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setState("feito");
      toast.success("PNG baixado");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[analise-operadores/export-png] erro:", err);
      setState("idle");
      toast.error("Não foi possível gerar o PNG");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "gerando"}
      className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ fontSize: "12px" }}
    >
      {state === "gerando" ? (
        <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : state === "feito" ? (
        <IconCheck
          size={14}
          style={{ color: "var(--success)" }}
          aria-hidden="true"
        />
      ) : (
        <IconDownload size={14} aria-hidden="true" />
      )}
      <span className="ds-mono-sm">Baixar PNG</span>
    </button>
  );
}
