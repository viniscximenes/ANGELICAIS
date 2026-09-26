"use client";

import { useCallback, useState } from "react";
import { IconLoader2, IconFileSpreadsheet } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { getTmaRosterAction } from "@/lib/tma/actions/get-tma-roster-action";
import { uploadTmaAction } from "@/lib/tma/actions/upload-tma-action";
import { parseTmaNoClient } from "@/lib/tma/parse-tma-client";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { TmaUploadProgressModal, type TmaUploadStep } from "./tma-upload-progress-modal";

interface TmaUploadDropzoneProps {
  /** Variante enxuta — área de drop mais baixa, sem o ícone central. */
  compact?: boolean;
}

export function TmaUploadDropzone({ compact = false }: TmaUploadDropzoneProps = {}) {
  const [step, setStep] = useState<TmaUploadStep>(null);
  const [resumoFinal, setResumoFinal] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessing = step !== null && step !== "done";

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setResumoFinal(null);
    setStep("reading-roster");

    try {
      // Roster (só email + gestor_id, payload pequeno) — usado pro matching
      // client-side. O CSV em si (~10MB em dia cheio) NUNCA sai do
      // navegador como arquivo bruto: o parse + matching + agregação rodam
      // aqui, e só o resultado processado (pequeno) vai pro servidor. Ver
      // parse-tma-client.ts — mandar o File/FormData bruto pra uma Server
      // Action estoura o limite de payload (413 em produção).
      const rosterResult = await getTmaRosterAction();
      if (!rosterResult.success) {
        setStep(null);
        setErrorMessage(rosterResult.error);
        toast.error("Falha ao processar relatório", { description: rosterResult.error });
        return;
      }

      setStep("parsing");
      const payload = await parseTmaNoClient(file, rosterResult.roster);

      setStep("uploading");
      let result;
      try {
        result = await uploadTmaAction(payload);
      } catch (err) {
        if (handleStaleActionError(err)) {
          setStep(null);
          return;
        }
        throw err;
      }

      if (!result.success) {
        setStep(null);
        setErrorMessage(result.error);
        toast.error("Falha ao processar relatório", { description: result.error });
        return;
      }

      setResumoFinal(
        `${result.atendimentosValidos} atendimentos válidos · ${result.operadoresAtualizados} operadores · ${result.semMatch} linhas de outras equipes ignoradas`,
      );
      setStep("done");

      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("[tma-upload] erro:", err);
      setStep(null);
      setErrorMessage("Erro ao processar arquivo");
      toast.error("Não foi possível processar o arquivo");
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

  const dropzoneState = isProcessing ? "processing" : isDragReject ? "reject" : isDragActive ? "active" : "idle";
  const rootProps = getRootProps({
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: () => setIsHovering(false),
  });
  const accessibleName =
    "Anexar base CSV. Arraste um arquivo ou clique para selecionar. Apenas arquivos .csv, limite de 50.000 linhas.";

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              {...rootProps}
              role="button"
              tabIndex={isProcessing ? -1 : 0}
              aria-label={accessibleName}
              aria-disabled={isProcessing}
              aria-busy={isProcessing}
              data-dropzone-state={dropzoneState}
              className="upload-dropzone-root-reports-tma-peso relative flex h-full flex-col cursor-pointer items-center justify-center rounded-xl border border-dashed outline-none transition-all duration-300 hover:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              style={{
                background: isDragActive ? "color-mix(in oklch, var(--primary) 8%, var(--muted))" : isHovering ? "var(--muted-hover-bg, var(--card))" : "var(--upload-idle-bg, var(--card))",
                borderColor: isDragReject ? "var(--danger)" : isDragActive ? "var(--primary)" : "var(--border)",
                borderWidth: isDragActive ? "2px" : "1px",
                boxShadow: isDragActive ? "0 0 40px var(--glow-accent)" : "var(--shadow-sm, none)",
                padding: compact ? "0.875rem 1.25rem" : "2.5rem 1.5rem",
                opacity: isProcessing ? 0.5 : 1,
                pointerEvents: isProcessing ? "none" : "auto",
                cursor: isProcessing ? "not-allowed" : "pointer",
                minHeight: compact ? "auto" : "100%",
              }}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className={`upload-dropzone-icon-reports-tma-peso relative flex items-center justify-center ${compact ? "h-9 w-9" : "h-14 w-14"}`} aria-hidden="true">
                  <span className="upload-dropzone-ring-reports-tma-peso absolute inset-0 rounded-full" />
                  {isProcessing ? (
                    <IconLoader2 size={compact ? 20 : 26} className="relative animate-spin text-muted-foreground" />
                  ) : (
                    <IconFileSpreadsheet size={compact ? 20 : 26} className="upload-dropzone-glyph-reports-tma-peso relative" />
                  )}
                </div>
                <p className="upload-dropzone-touch-hint-reports-tma-peso ds-mono-sm text-muted-foreground/80 text-[11px] sm:hidden">
                  Toque para selecionar um CSV
                </p>
              </div>
              {errorMessage && !isProcessing && (
                <div role="alert" className="status-danger ds-small mt-4 flex items-center justify-center gap-2 rounded-md p-3">{errorMessage}</div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Arraste um CSV aqui ou clique para selecionar · até 50.000 linhas</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TmaUploadProgressModal step={step} resumoFinal={resumoFinal} />
    </>
  );
}
