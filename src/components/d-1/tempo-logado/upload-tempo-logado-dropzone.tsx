"use client";

import { useCallback, useState } from "react";
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { UploadProgressModal } from "@/components/d-1/upload-progress-modal";
import { uploadTempoLogadoAction } from "@/lib/d1-db/actions/upload-tempo-logado-action";

export type UploadStep =
  | "attaching"
  | "deleting"
  | "replacing"
  | "done"
  | null;

interface UploadTempoLogadoDropzoneProps {
  /** Visual compacto (barra horizontal fina) — usado na página unificada do gestor. Default: card grande vertical. */
  compact?: boolean;
}

export function UploadTempoLogadoDropzone({ compact = false }: UploadTempoLogadoDropzoneProps = {}) {
  const [step, setStep] = useState<UploadStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsWritten, setRowsWritten] = useState<number>(0);

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setStep("attaching");

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let csvText: string;

      // BOM UTF-8 (EF BB BF)
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        csvText = new TextDecoder("utf-8").decode(bytes.slice(3));
      } else {
        try {
          const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
          csvText = utf8Decoder.decode(bytes);
        } catch {
          csvText = new TextDecoder("windows-1252").decode(bytes);
        }
      }

      // Validação rápida no client (linha minimamente decente)
      const firstLineBreak = csvText.indexOf("\n");
      if (firstLineBreak === -1 || csvText.length < 50) {
        setStep(null);
        setErrorMessage("CSV vazio ou inválido.");
        toast.error("CSV vazio");
        return;
      }

      await new Promise((r) => setTimeout(r, 600));

      setStep("deleting");
      await new Promise((r) => setTimeout(r, 400));

      setStep("replacing");

      const uploadResult = await uploadTempoLogadoAction(csvText);

      if (!uploadResult.success) {
        setStep(null);
        setErrorMessage(uploadResult.error);
        toast.error("Falha ao atualizar base", {
          description: uploadResult.error,
        });
        return;
      }

      setRowsWritten(uploadResult.rowsWritten);
      setStep("done");
      toast.success("Base atualizada", {
        description: `${uploadResult.rowsWritten} linhas inseridas`,
      });

      setTimeout(() => {
        setStep(null);
        window.location.reload();
      }, 3000);
    } catch (err) {
      setStep(null);
      setErrorMessage("Erro ao ler arquivo");
      toast.error("Não foi possível ler o arquivo");
      console.error("[upload-tempo-logado] read error:", err);
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

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      multiple: false,
      disabled: step !== null && step !== "done",
    });

  const isProcessing = step !== null && step !== "done";

  if (compact) {
    return (
      <>
        <div
          {...getRootProps()}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-dashed transition-colors duration-200 hover:border-primary"
          style={{
            background: isDragActive
              ? "color-mix(in oklch, var(--primary) 8%, var(--muted))"
              : "var(--card)",
            borderColor: isDragReject
              ? "var(--danger)"
              : isDragActive
                ? "var(--primary)"
                : "var(--border)",
            padding: "6px 12px",
            opacity: isProcessing ? 0.5 : 1,
            pointerEvents: isProcessing ? "none" : "auto",
            fontSize: "12px",
          }}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <IconFileSpreadsheet
              size={14}
              style={{ color: "var(--primary)" }}
              aria-hidden="true"
            />
          ) : (
            <IconUpload size={14} className="text-primary" aria-hidden="true" />
          )}
          <span className="ds-mono-sm text-muted-foreground whitespace-nowrap">
            {isDragActive ? "Solte para enviar" : "Enviar CSV"}
          </span>
        </div>

        {errorMessage && !isProcessing && (
          <span role="alert" className="status-danger ds-small rounded-md px-2 py-1">
            {errorMessage}
          </span>
        )}

        <UploadProgressModal step={step} rowsWritten={rowsWritten} />
      </>
    );
  }

  return (
    <>
      <div
        {...getRootProps()}
        className="relative flex h-full cursor-pointer items-center justify-center rounded-xl border border-dashed transition-all duration-300 hover:border-primary"
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
          padding: "1rem 1.25rem",
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
          minHeight: "90px",
        }}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-1 text-center">
          <p className="ds-body text-foreground font-semibold">
            {isDragActive
              ? "Solte o arquivo para enviar"
              : "Arraste o arquivo CSV aqui ou clique para selecionar"}
          </p>
          <p className="ds-mono-sm text-muted-foreground/80 text-[11px]">
            Apenas arquivos .csv · limite de 50.000 linhas
          </p>
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

      <UploadProgressModal step={step} rowsWritten={rowsWritten} />
    </>
  );
}
