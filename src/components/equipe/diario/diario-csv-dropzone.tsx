"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { ReactBitsFolder } from "@/components/ui/react-bits-folder";

interface DiarioCsvDropzoneProps {
  onCsv: (csvText: string, fileName: string) => void;
}

// Tipagem mínima da File System Access API (não está no lib.dom do TS).
type ShowOpenFilePicker = (options: {
  startIn?: "downloads";
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}) => Promise<{ getFile: () => Promise<File> }[]>;

const UPLOAD_HINT =
  "Anexar base CSV. Arraste um arquivo ou clique para selecionar. Apenas arquivos .csv, limite de 50.000 linhas.";

/*
 * Mesmo card de anexo de /s/reports/consolidado (UploadDropzone, variante
 * "card" com abrirEmDownloads): pasta animada, padding/altura e estados de
 * drag/rejeição idênticos. As regras continuam as desta página: o CSV é lido
 * só no client e repassado via onCsv — nada é enviado/gravado.
 */
export function DiarioCsvDropzone({ onCsv }: DiarioCsvDropzoneProps) {
  const [lendo, setLendo] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  // Detectado só no client (evita divergência de hidratação com o SSR).
  const [pickerNativo, setPickerNativo] = useState(false);
  useEffect(() => {
    setPickerNativo("showOpenFilePicker" in window);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setLendo(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());

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

        if (csvText.indexOf("\n") === -1 || csvText.length < 30) {
          toast.error("CSV vazio ou inválido", {
            className: "operacao-diario-toast",
          });
          return;
        }

        onCsv(csvText, file.name);
      } catch {
        toast.error("Não foi possível ler o arquivo", {
          className: "operacao-diario-toast",
        });
      } finally {
        setLendo(false);
      }
    },
    [onCsv],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) handleFile(file);
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
      disabled: lendo,
      // Com o seletor nativo ativo, clique/teclado são tratados abaixo
      // (abrirSeletorDownloads); o drag & drop continua com o dropzone.
      noClick: pickerNativo,
      noKeyboard: pickerNativo,
    });

  const abrirSeletorDownloads = useCallback(async () => {
    const showOpenFilePicker = (
      window as unknown as { showOpenFilePicker: ShowOpenFilePicker }
    ).showOpenFilePicker;
    try {
      const [handle] = await showOpenFilePicker({
        startIn: "downloads",
        types: [
          { description: "Arquivo CSV", accept: { "text/csv": [".csv"] } },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
      });
      const file = await handle.getFile();
      if (!file.name.toLowerCase().endsWith(".csv")) return;
      handleFile(file);
    } catch (err) {
      // Usuário fechou/cancelou o seletor — nada a fazer.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Qualquer outra falha da API: volta pro seletor padrão.
      open();
    }
  }, [handleFile, open]);

  const dropState = lendo
    ? "processing"
    : isDragReject
      ? "reject"
      : isDragActive
        ? "active"
        : "idle";

  const rootProps = getRootProps({
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: () => setIsHovering(false),
    ...(pickerNativo && {
      onClick: () => {
        if (!lendo) void abrirSeletorDownloads();
      },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (lendo || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        void abrirSeletorDownloads();
      },
    }),
  });

  return (
    <div
      {...rootProps}
      role="button"
      tabIndex={lendo ? -1 : 0}
      data-dropzone-state={dropState}
      aria-label={lendo ? "Lendo arquivo CSV" : UPLOAD_HINT}
      aria-disabled={lendo}
      aria-busy={lendo}
      className="upload-dropzone-root-operacao-diario relative flex h-full cursor-pointer items-center justify-center rounded-xl border border-dashed outline-none transition-all duration-300 hover:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
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
        boxShadow: isDragActive
          ? "0 0 40px var(--glow-accent)"
          : "var(--shadow-sm, none)",
        padding: "2.5rem 1.5rem",
        opacity: lendo ? 0.5 : 1,
        pointerEvents: lendo ? "none" : "auto",
        cursor: lendo ? "not-allowed" : "pointer",
        minHeight: "100%",
      }}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div
          className="relative flex min-h-16 min-w-24 items-center justify-center"
          aria-hidden="true"
        >
          {lendo ? (
            <IconLoader2
              size={26}
              className="animate-spin text-muted-foreground"
            />
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

        {/* Dica sempre perceptível em touch/telas pequenas, já que hover não existe. */}
        <p className="upload-dropzone-touch-hint-operacao-diario ds-mono-sm text-muted-foreground/80 text-[11px] sm:hidden">
          Toque para selecionar um CSV
        </p>
      </div>
    </div>
  );
}
