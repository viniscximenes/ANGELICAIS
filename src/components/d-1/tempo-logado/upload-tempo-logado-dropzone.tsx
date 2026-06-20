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
          padding: "2.5rem 1.5rem",
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
          minHeight: "100%",
        }}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 rounded-full bg-muted border border-border/40 transition-colors hover:bg-muted/80">
            {isDragActive ? (
              <IconFileSpreadsheet
                size={28}
                style={{ color: "var(--primary)" }}
                aria-hidden="true"
              />
            ) : (
              <IconUpload
                size={28}
                className="text-primary"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="ds-body font-semibold">
              {isDragActive
                ? "Solte para enviar"
                : "Arraste o CSV aqui ou clique para selecionar"}
            </p>
            <p className="ds-small text-muted-foreground">
              Apenas .csv · até 50 mil linhas
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

      <UploadProgressModal step={step} rowsWritten={rowsWritten} />
    </>
  );
}
