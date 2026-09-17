"use client";

import { useCallback, useState } from "react";
import { IconCloudUpload, IconFileSpreadsheet } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { uploadTmaAction } from "@/lib/tma/actions/upload-tma-action";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";

interface TmaUploadDropzoneProps {
  /** Variante enxuta — área de drop mais baixa, sem o ícone central. */
  compact?: boolean;
}

export function TmaUploadDropzone({ compact = false }: TmaUploadDropzoneProps = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    const toastId = toast.loading("Processando relatório de voz...");

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let csvText: string;
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        csvText = new TextDecoder("utf-8").decode(bytes.slice(3));
      } else {
        try {
          csvText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
          csvText = new TextDecoder("windows-1252").decode(bytes);
        }
      }

      let result;
      try {
        result = await uploadTmaAction(csvText);
      } catch (err) {
        if (handleStaleActionError(err)) return;
        throw err;
      }

      if (!result.success) {
        setErrorMessage(result.error);
        toast.error("Falha ao processar relatório", { id: toastId, description: result.error });
        return;
      }

      toast.success("TMA atualizado", {
        id: toastId,
        description: `${result.atendimentosValidos} atendimentos válidos · ${result.operadoresAtualizados} operadores · ${result.semMatch} linhas de outras equipes ignoradas`,
      });

      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("[tma-upload] erro:", err);
      setErrorMessage("Erro ao processar arquivo");
      toast.error("Não foi possível processar o arquivo", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      handleFile(file);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <div
      {...getRootProps({
        onMouseEnter: () => setIsHovering(true),
        onMouseLeave: () => setIsHovering(false),
      })}
      className={
        compact
          ? "relative flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed transition-all duration-300 hover:border-primary"
          : "relative flex h-full cursor-pointer items-center justify-center rounded-xl border border-dashed transition-all duration-300 hover:border-primary"
      }
      style={{
        background: isDragActive
          ? "color-mix(in oklch, var(--primary) 8%, var(--muted))"
          : isHovering
            ? "var(--muted-hover-bg, var(--card))"
            : "var(--upload-idle-bg, var(--card))",
        borderColor: isDragReject
          ? "var(--danger)"
          : isDragActive
            ? "var(--primary)"
            : "var(--border)",
        boxShadow: isDragActive ? "0 0 40px var(--glow-accent)" : "var(--shadow-sm, none)",
        padding: compact ? "0.875rem 1.25rem" : "2.5rem 1.5rem",
        opacity: isProcessing ? 0.5 : 1,
        pointerEvents: isProcessing ? "none" : "auto",
        minHeight: compact ? "auto" : "100%",
      }}
    >
      <input {...getInputProps()} />

      <div className={compact ? "flex items-center justify-center gap-3 text-center" : "flex flex-col items-center justify-center gap-3 text-center"}>
        {!compact && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-muted-foreground">
            {isDragActive ? (
              <IconCloudUpload size={30} aria-hidden="true" />
            ) : (
              <IconFileSpreadsheet size={30} aria-hidden="true" />
            )}
          </div>
        )}

        <div className={compact ? "space-y-0.5" : "space-y-1"}>
          <p className={compact ? "ds-body text-foreground text-sm font-semibold" : "ds-body text-foreground font-semibold"}>
            {isDragActive
              ? "Solte o arquivo para enviar"
              : "Arraste o relatório de voz (CDR) aqui ou clique para selecionar"}
          </p>
          <p className="ds-mono-sm text-muted-foreground/80 text-[11px]">
            Apenas arquivos .csv, delimitados por ;
          </p>
        </div>
      </div>

      {errorMessage && !isProcessing && (
        <div
          role="alert"
          className="status-danger ds-small mt-4 flex items-center justify-center gap-2 rounded-md p-3"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
