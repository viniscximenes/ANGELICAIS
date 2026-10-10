"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { ReactBitsFolder } from "@/components/ui/react-bits-folder";
import { getTmaRosterAction } from "@/lib/tma/actions/get-tma-roster-action";
import { uploadTmaAction } from "@/lib/tma/actions/upload-tma-action";
import { lerCsvTma, montarPayloadTma, partesLocaisDoCsv } from "@/lib/tma/parse-tma-client";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { TmaUploadProgressModal, type TmaUploadStep } from "./tma-upload-progress-modal";

// Tipagem mínima da File System Access API (não está no lib.dom do TS) —
// mesma do UploadDropzone do Consolidado.
type ShowOpenFilePicker = (options: {
  startIn?: "downloads";
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}) => Promise<{ getFile: () => Promise<File> }[]>;

export function TmaUploadDropzone() {
  // Clique/teclado abre o seletor de arquivos já na pasta Downloads e só com
  // .csv (sem "Todos os arquivos"), via showOpenFilePicker (Chrome/Edge) —
  // mesmo comportamento do anexo do Consolidado. Navegadores sem a API
  // seguem com o seletor padrão. Arrastar e soltar não muda. Detectado só no
  // client (evita divergência de hidratação com o SSR).
  const [pickerNativo, setPickerNativo] = useState(false);
  useEffect(() => {
    setPickerNativo("showOpenFilePicker" in window);
  }, []);
  const [step, setStep] = useState<TmaUploadStep>(null);
  const [resumoFinal, setResumoFinal] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessing = step !== null && step !== "done";

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setResumoFinal(null);
    setStep("parsing");

    try {
      // O CSV (~10MB em dia cheio) NUNCA sai do navegador como arquivo
      // bruto: o parse + matching rodam aqui, e só os atendimentos válidos
      // vão pro servidor. Ver parse-tma-client.ts — mandar o File/FormData
      // bruto pra uma Server Action estoura o limite de payload (413 em
      // produção).
      const leitura = await lerCsvTma(file);

      // Roster só dos operadores que aparecem no arquivo (só e-mail) — usado
      // pro matching por parte local. O gestor de cada um é resolvido no
      // servidor, no upload.
      setStep("reading-roster");
      const rosterResult = await getTmaRosterAction(partesLocaisDoCsv(leitura));
      if (!rosterResult.success) {
        setStep(null);
        setErrorMessage(rosterResult.error);
        toast.error("Falha ao processar relatório", { description: rosterResult.error, className: "toast-padrao" });
        return;
      }

      const payload = montarPayloadTma(leitura, rosterResult.roster);

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
        toast.error("Falha ao processar relatório", { description: result.error, className: "toast-padrao" });
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
      toast.error("Não foi possível processar o arquivo", { className: "toast-padrao" });
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

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    multiple: false,
    disabled: isProcessing,
    // Com o seletor nativo ativo, clique/teclado são tratados abaixo
    // (abrirSeletorDownloads); o drag & drop continua com o dropzone.
    noClick: pickerNativo,
    noKeyboard: pickerNativo,
  });

  const abrirSeletorDownloads = useCallback(async () => {
    const showOpenFilePicker = (window as unknown as { showOpenFilePicker: ShowOpenFilePicker })
      .showOpenFilePicker;
    try {
      const [handle] = await showOpenFilePicker({
        startIn: "downloads",
        types: [{ description: "Arquivo CSV", accept: { "text/csv": [".csv"] } }],
        excludeAcceptAllOption: true,
        multiple: false,
      });
      const file = await handle.getFile();
      // Mesmo critério do `accept` do dropzone: arquivo fora de .csv é
      // ignorado em silêncio, como no fluxo padrão.
      if (!file.name.toLowerCase().endsWith(".csv")) return;
      handleFile(file);
    } catch (err) {
      // Usuário fechou/cancelou o seletor — nada a fazer.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Qualquer outra falha da API: volta pro seletor padrão.
      open();
    }
  }, [handleFile, open]);

  const dropzoneState = isProcessing ? "processing" : isDragReject ? "reject" : isDragActive ? "active" : "idle";
  const rootProps = getRootProps({
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: () => setIsHovering(false),
    ...(pickerNativo && {
      onClick: () => {
        if (!isProcessing) void abrirSeletorDownloads();
      },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (isProcessing || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        void abrirSeletorDownloads();
      },
    }),
  });
  const accessibleName =
    // Limite aplicado em uploadTmaAction (MAX_LINHAS_CSV): conta os
    // atendimentos de retenção válidos do arquivo, não as linhas brutas.
    "Anexar base CSV. Arraste um arquivo ou clique para selecionar. Apenas arquivos .csv, limite de 50.000 atendimentos.";

  return (
    <>
      <div
        {...rootProps}
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-label={accessibleName}
        aria-disabled={isProcessing}
        aria-busy={isProcessing}
        data-dropzone-state={dropzoneState}
        className="relative flex h-full flex-col cursor-pointer items-center justify-center rounded-xl border border-dashed outline-none transition-all duration-300 hover:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        style={{
          background: isDragActive ? "color-mix(in oklch, var(--primary) 8%, var(--muted))" : isHovering ? "var(--dropzone-hover-bg, var(--card))" : "var(--dropzone-idle-bg, var(--card))",
          borderColor: isDragReject ? "var(--danger)" : isDragActive ? "var(--primary)" : "var(--border)",
          borderWidth: isDragActive ? "2px" : "1px",
          boxShadow: isDragActive ? "0 0 40px var(--glow-accent)" : "var(--shadow-sm, none)",
          padding: "2.5rem 1.5rem",
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
          cursor: isProcessing ? "not-allowed" : "pointer",
          minHeight: "100%",
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="relative flex min-h-16 min-w-24 items-center justify-center" aria-hidden="true">
            {isProcessing ? (
              <IconLoader2 size={26} className="animate-spin text-muted-foreground" />
            ) : (
              <ReactBitsFolder
                size={0.68}
                open={isHovering || isDragActive}
                color={isDragReject ? "var(--danger)" : "var(--primary)"}
                backColor={
                  isDragReject
                    ? "color-mix(in srgb, var(--danger) 78%, #000 22%)"
                    : "color-mix(in srgb, var(--primary) 78%, #000 22%)"
                }
                paperColors={[
                  "var(--upload-folder-paper-1, color-mix(in srgb, var(--primary-foreground) 72%, var(--muted) 28%))",
                  "var(--upload-folder-paper-2, color-mix(in srgb, var(--primary-foreground) 86%, var(--card) 14%))",
                  "var(--upload-folder-paper-3, var(--primary-foreground))",
                ]}
              />
            )}
          </div>
          <p className="ds-mono-sm text-muted-foreground/80 text-[11px] sm:hidden">
            Toque para selecionar um CSV
          </p>
        </div>
        {errorMessage && !isProcessing && (
          <div role="alert" className="status-danger ds-small mt-4 flex items-center justify-center gap-2 rounded-md p-3">{errorMessage}</div>
        )}
      </div>
      <TmaUploadProgressModal step={step} resumoFinal={resumoFinal} />
    </>
  );
}
