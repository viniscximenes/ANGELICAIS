"use client";

import { useCallback, useState } from "react";
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import {
  getUltimoReportHoraAction,
  uploadBaseAction,
} from "@/lib/auth/upload-base-action";
import { getTimePartsInBR } from "@/lib/utils/format-datetime-br";
import { ConfirmRecentReportDialog } from "./confirm-recent-report-dialog";
import { UploadProgressModal } from "./upload-progress-modal";

export type UploadStep =
  | "attaching"
  | "deleting"
  | "replacing"
  | "done"
  | null;

const REPORT_RECENTE_MIN = 5;

/**
 * Minutos decorridos desde a hora do report "HH:MM" (S2), na hora atual de
 * Brasília. Retorna null se não houver hora ou se o formato for inválido.
 * Pode ser negativo (virada de dia) — o caller só age no intervalo [0, 5).
 */
function minutosDesdeReport(hora: string | null): number | null {
  if (!hora) return null;
  const m = hora.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const reportMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const { hour, minute } = getTimePartsInBR();
  return hour * 60 + minute - reportMin;
}

interface UploadDropzoneProps {
  /**
   * Ativa a regra dos 5 min: antes de enviar, lê S2 (último report) e, se
   * < 5 min, pede confirmação. Usado pelo painel do gestor.
   */
  confirmRecentReport?: boolean;
}

export function UploadDropzone({
  confirmRecentReport = false,
}: UploadDropzoneProps) {
  const [step, setStep] = useState<UploadStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsWritten, setRowsWritten] = useState<number>(0);
  // Regra dos 5 min: linhas pendentes aguardando confirmação no dialog.
  const [pendingRows, setPendingRows] = useState<string[][] | null>(null);
  const [pendingCsvText, setPendingCsvText] = useState<string>("");
  const [ultimoReportHora, setUltimoReportHora] = useState("");
  const [ultimoReportNome, setUltimoReportNome] = useState<string | null>(null);

  // Executa o upload de fato (etapas + action + reload).
  const processUpload = useCallback(async (csvText: string) => {
    setStep("deleting");
    await new Promise((r) => setTimeout(r, 400));

    setStep("replacing");
    const uploadResult = await uploadBaseAction(csvText);

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
    toast.success("Base updated", {
      description: `${uploadResult.rowsWritten} linhas inseridas`,
    });

    setTimeout(() => {
      setStep(null);
      window.location.reload();
    }, 3000);
  }, []);

  const handleConfirmSend = useCallback(() => {
    const csv = pendingCsvText;
    setPendingRows(null);
    setPendingCsvText("");
    if (csv) void processUpload(csv);
  }, [pendingCsvText, processUpload]);

  const handleCancelSend = useCallback(() => {
    setPendingRows(null);
    setPendingCsvText("");
    setStep(null);
  }, []);

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

          // Regra dos 5 min (opt-in): se o último report (S2) foi há menos de
          // 5 min, pausa e pede confirmação antes de prosseguir.
          if (confirmRecentReport) {
            const { hora, nomeSupervisor } = await getUltimoReportHoraAction();
            const mins = minutosDesdeReport(hora);
            if (mins !== null && mins >= 0 && mins < REPORT_RECENTE_MIN) {
              setUltimoReportHora(hora ?? "");
              setUltimoReportNome(nomeSupervisor);
              setPendingRows(rows);
              setPendingCsvText(csvText);
              setStep(null); // esconde o progresso enquanto o dialog decide
              return;
            }
          }

          await processUpload(csvText);
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
  }, [confirmRecentReport, processUpload]);

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
      <ConfirmRecentReportDialog
        open={pendingRows !== null}
        limiteMinutos={REPORT_RECENTE_MIN}
        hora={ultimoReportHora.match(/^(\d{1,2}:\d{2})/)?.[1] ?? ultimoReportHora}
        nomeSupervisor={ultimoReportNome}
        onConfirm={handleConfirmSend}
        onCancel={handleCancelSend}
      />

    </>
  );
}
