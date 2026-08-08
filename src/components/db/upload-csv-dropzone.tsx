"use client";

import { useCallback, useState } from "react";
import { IconCloudUpload, IconFileSpreadsheet, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { uploadCsvAction } from "@/lib/db/actions/upload-csv-action";

/**
 * Converte pra base64 preservando os bytes crus do arquivo — o parser
 * (parse-csv-pausas.ts) precisa deles pra detectar/corrigir o encoding
 * Latin-1/Windows-1252 e o mojibake, o que uma string já decodificada no
 * client (como no upload do D-1) perderia.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function UploadCsvDropzone() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setIsProcessing(true);

      try {
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        const result = await uploadCsvAction(base64);

        if (!result.success) {
          setErrorMessage(result.error);
          toast.error("Falha ao salvar CSV", { description: result.error });
          return;
        }

        const [, mes, dia] = result.dataRef.split("-");
        toast.success(
          `CSV do dia ${dia}/${mes} salvo (${result.rowsWritten} linhas)`,
        );
        router.refresh();
      } catch (err) {
        setErrorMessage("Erro ao processar arquivo");
        toast.error("Não foi possível ler o arquivo");
        console.error("[upload-csv-dropzone] erro:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [router],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      void handleFile(file);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
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
      {...getRootProps()}
      className="relative flex cursor-pointer items-center justify-center rounded-xl border border-dashed transition-all duration-300 hover:border-primary"
      style={{
        background: isDragActive
          ? "color-mix(in oklch, var(--primary) 8%, var(--muted))"
          : "var(--card)",
        borderColor: isDragReject
          ? "var(--danger)"
          : isDragActive
            ? "var(--primary)"
            : "var(--border)",
        boxShadow: isDragActive ? "0 0 40px var(--glow-accent)" : "none",
        padding: "2.5rem 1.5rem",
        opacity: isProcessing ? 0.6 : 1,
        pointerEvents: isProcessing ? "none" : "auto",
        minHeight: "180px",
      }}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-muted-foreground">
          {isProcessing ? (
            <IconLoader2 size={26} className="animate-spin" aria-hidden="true" />
          ) : isDragActive ? (
            <IconCloudUpload size={26} aria-hidden="true" />
          ) : (
            <IconFileSpreadsheet size={26} aria-hidden="true" />
          )}
        </div>

        <div className="space-y-1">
          <p className="ds-body text-foreground font-semibold">
            {isProcessing
              ? "Processando CSV..."
              : isDragActive
                ? "Solte o arquivo para enviar"
                : "Arraste o CSV do dia aqui ou clique para selecionar"}
          </p>
          <p className="ds-mono-sm text-muted-foreground/80 text-[11px]">
            Login/logout/pausas do dia · sobrescreve o mesmo dia se já existir
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
