"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { IconFileSpreadsheet, IconLoader2, IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { UploadProgressModal } from "@/components/d-1/upload-progress-modal";
import { ReactBitsFolder } from "@/components/ui/react-bits-folder";
import { uploadTempoLogadoAction } from "@/lib/d1-db/actions/upload-tempo-logado-action";
import { useFaviconLoading } from "@/lib/favicon/use-favicon-loading";

type UploadStep =
  | "attaching"
  | "deleting"
  | "replacing"
  | "done"
  | null;

interface UploadTempoLogadoDropzoneProps {
  /** Visual compacto (barra horizontal fina) — usado na página unificada do gestor. Default: card grande vertical. */
  compact?: boolean;
  /**
   * Clique/teclado abre o seletor de arquivos já na pasta Downloads e só com
   * .csv (sem a opção "Todos os arquivos"), via File System Access API
   * (showOpenFilePicker — Chrome/Edge). Navegadores sem a API seguem com o
   * seletor padrão de sempre. Arrastar e soltar não muda. MESMO mecanismo
   * de UploadDropzone (/s/reports/consolidado, prop de mesmo nome).
   */
  abrirEmDownloads?: boolean;
}

// Tipagem mínima da File System Access API (não está no lib.dom do TS).
type ShowOpenFilePicker = (options: {
  startIn?: "downloads";
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}) => Promise<{ getFile: () => Promise<File> }[]>;

export function UploadTempoLogadoDropzone({
  compact = false,
  abrirEmDownloads = false,
}: UploadTempoLogadoDropzoneProps = {}) {
  // Detectado só no client (evita divergência de hidratação com o SSR).
  const [pickerNativo, setPickerNativo] = useState(false);
  useEffect(() => {
    setPickerNativo(abrirEmDownloads && "showOpenFilePicker" in window);
  }, [abrirEmDownloads]);
  const [step, setStep] = useState<UploadStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsWritten, setRowsWritten] = useState<number>(0);
  const [isHovering, setIsHovering] = useState(false);

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
        toast.error("CSV vazio", { className: "reports-tempo-indisp-toast" });
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
          className: "reports-tempo-indisp-toast",
        });
        return;
      }

      setRowsWritten(uploadResult.rowsWritten);
      setStep("done");

      setTimeout(() => {
        setStep(null);
        window.location.reload();
      }, 3000);
    } catch (err) {
      setStep(null);
      setErrorMessage("Erro ao ler arquivo");
      toast.error("Não foi possível ler o arquivo", { className: "reports-tempo-indisp-toast" });
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

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      onDrop,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      multiple: false,
      disabled: step !== null && step !== "done",
      // Com o seletor nativo ativo, clique/teclado são tratados abaixo
      // (abrirSeletorDownloads); o drag & drop continua com o dropzone.
      noClick: pickerNativo,
      noKeyboard: pickerNativo,
    });

  const isProcessing = step !== null && step !== "done";

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
  // Favicon animado ("carregando") — step volta pra null em todo caminho
  // de erro (ver catches acima), então cobre sucesso e falha igual.
  useFaviconLoading(isProcessing);

  const dropzoneState = isProcessing
    ? "processing"
    : isDragReject
      ? "reject"
      : isDragActive
        ? "active"
        : "idle";

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

  // Ícone único animado, sem texto permanente — mesmo padrão de
  // UploadDropzone (/s/reports/consolidado, 22ª rodada): a informação
  // continua acessível via aria-label completo (leitor de tela).
  // Mensagens de erro reais continuam em texto visível (.status-danger).
  const accessibleName =
    "Anexar base CSV de tempo logado e indisponibilidade. Arraste um arquivo ou clique para selecionar. Apenas arquivos .csv, limite de 50.000 linhas.";

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
        className="upload-dropzone-root-reports-tempo-indisp relative flex h-full cursor-pointer items-center justify-center rounded-xl border border-dashed outline-none transition-all duration-300 hover:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        style={{
          background: isDragActive
            ? "color-mix(in oklch, var(--primary) 8%, var(--muted))"
            : isHovering
              ? "var(--dropzone-hover-bg, var(--card))"
              : "var(--dropzone-idle-bg, var(--card))",
          borderColor: isDragReject
            ? "var(--danger)"
            : isDragActive
              ? "var(--primary)"
              : "var(--border)",
          borderWidth: isDragActive ? "2px" : "1px",
          boxShadow: isDragActive ? "0 0 40px var(--glow-accent)" : "var(--shadow-sm, none)",
          padding: "1rem 1.25rem",
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
          cursor: isProcessing ? "not-allowed" : "pointer",
          minHeight: "140px",
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

          <p className="upload-dropzone-touch-hint-reports-tempo-indisp ds-mono-sm text-muted-foreground/80 text-[11px] sm:hidden">
            Toque para selecionar um CSV
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

      <UploadProgressModal step={step} rowsWritten={rowsWritten} variant="reports-tempo-indisp" />
    </>
  );
}
