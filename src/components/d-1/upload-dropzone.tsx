"use client";

import { useCallback, useState } from "react";
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { uploadBaseAction } from "@/lib/auth/upload-base-action";
import { UploadProgressModal } from "./upload-progress-modal";

export type UploadStep =
  | "attaching"
  | "deleting"
  | "replacing"
  | "done"
  | null;

export function UploadDropzone() {
  const [step, setStep] = useState<UploadStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsWritten, setRowsWritten] = useState<number>(0);

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setStep("attaching");

    try {
      // Lê o arquivo como ArrayBuffer pra detectar encoding
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let csvText: string;

      // Detecta BOM UTF-8 (EF BB BF)
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        // UTF-8 com BOM — pula os 3 primeiros bytes
        csvText = new TextDecoder("utf-8").decode(bytes.slice(3));
      } else {
        // Tenta UTF-8 primeiro (modo estrito)
        try {
          const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
          csvText = utf8Decoder.decode(bytes);
        } catch {
          // UTF-8 falhou — provavelmente Windows-1252 (CSV exportado do Excel)
          csvText = new TextDecoder("windows-1252").decode(bytes);
        }
      }

      // Agora passa a STRING decodificada pro papaparse
      Papa.parse<string[]>(csvText, {
        complete: async (result) => {
          if (result.errors.length > 0) {
            setStep(null);
            setErrorMessage("Erro ao ler o CSV. Verifique o formato.");
            toast.error("CSV inválido");
            return;
          }

          const rows = result.data.filter((row) =>
            row.some((cell) => cell !== ""),
          );

          if (rows.length < 2) {
            setStep(null);
            setErrorMessage("CSV vazio ou só com cabeçalho.");
            toast.error("CSV vazio");
            return;
          }

          // Delay pra UX mostrar a etapa "ANEXANDO"
          await new Promise((r) => setTimeout(r, 600));

          // Etapa 2 — apagando antiga
          setStep("deleting");
          await new Promise((r) => setTimeout(r, 400));

          // Etapa 3 — substituindo
          setStep("replacing");

          const uploadResult = await uploadBaseAction(rows);

          if (!uploadResult.success) {
            setStep(null);
            setErrorMessage(uploadResult.error);
            toast.error("Falha ao atualizar base", {
              description: uploadResult.error,
            });
            return;
          }

          // Etapa 4 — concluído
          setRowsWritten(uploadResult.rowsWritten);
          setStep("done");
          toast.success("Base atualizada", {
            description: `${uploadResult.rowsWritten} linhas inseridas`,
          });

          // Após 3s, recarrega a página para mostrar dados novos
          setTimeout(() => {
            setStep(null);
            window.location.reload();
          }, 3000);
        },
        error: (err: Error) => {
          setStep(null);
          setErrorMessage(err.message);
          toast.error("Erro ao processar arquivo");
        },
        skipEmptyLines: true,
      });
    } catch (err) {
      setStep(null);
      setErrorMessage("Erro ao ler arquivo");
      toast.error("Não foi possível ler o arquivo");
      console.error("[upload] read error:", err);
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
          minHeight: "100%",
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
            <p className="ds-body">
              {isDragActive
                ? "Solte para enviar"
                : "Arraste o CSV aqui ou clique para selecionar"}
            </p>
            <p className="ds-small text-muted-foreground">
              Apenas .csv · até 10 mil linhas
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
