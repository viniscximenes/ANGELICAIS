"use client";

import { useCallback, useState } from "react";
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { UploadProgressModal } from "@/components/d-1/upload-progress-modal";
import { uploadBase2Action } from "@/lib/auth/upload-base-2-action";

export type UploadStep =
  | "attaching"
  | "deleting"
  | "replacing"
  | "done"
  | null;

export function UploadTempoLogadoDropzone() {
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

      const uploadResult = await uploadBase2Action(csvText);

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

  return (
    <>
      <div
        {...getRootProps()}
        className="relative flex h-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-all"
        style={{
          background: isDragActive
            ? "color-mix(in oklch, var(--primary) 8%, var(--elevation-1-bg))"
            : "var(--elevation-1-bg)",
          borderColor: isDragReject
            ? "var(--danger)"
            : isDragActive
              ? "var(--primary)"
              : "var(--border)",
          boxShadow: isDragActive ? "0 0 40px var(--glow-accent)" : "none",
          padding: "2rem 1.5rem",
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
          minHeight: "200px",
        }}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {isDragActive ? (
            <IconFileSpreadsheet
              size={32}
              style={{ color: "var(--primary)" }}
              aria-hidden="true"
            />
          ) : (
            <IconUpload
              size={32}
              className="text-muted-foreground"
              aria-hidden="true"
            />
          )}

          <div className="space-y-1">
            <p className="ds-small">
              {isDragActive ? "Solte para enviar" : "Arraste o CSV aqui"}
            </p>
            <p className="ds-mono-sm text-muted-foreground">
              .csv · até 50 mil linhas
            </p>
          </div>
        </div>

        {errorMessage && !isProcessing && (
          <div
            role="alert"
            className="status-danger ds-mono-sm absolute right-2 bottom-2 left-2 mt-4 flex items-center justify-center gap-2 rounded-md p-2"
          >
            {errorMessage}
          </div>
        )}
      </div>

      <UploadProgressModal step={step} rowsWritten={rowsWritten} />
    </>
  );
}
