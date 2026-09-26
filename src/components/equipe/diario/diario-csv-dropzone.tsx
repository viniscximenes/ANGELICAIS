"use client";

import { useCallback, useState } from "react";
import {
  IconFileSpreadsheet,
  IconLoader2,
} from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DiarioCsvDropzoneProps {
  onCsv: (csvText: string, fileName: string) => void;
  fontVariableClassName: string;
}

const UPLOAD_HINT =
  "Arraste um arquivo CSV ou clique para selecionar. Limite de 50.000 linhas.";

export function DiarioCsvDropzone({
  onCsv,
  fontVariableClassName,
}: DiarioCsvDropzoneProps) {
  const [lendo, setLendo] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

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

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    multiple: false,
    disabled: lendo,
  });

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
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            {...rootProps}
            role="button"
            tabIndex={lendo ? -1 : 0}
            data-dropzone-state={dropState}
            aria-label={lendo ? "Lendo arquivo CSV" : UPLOAD_HINT}
            aria-disabled={lendo}
            aria-busy={lendo}
            className="upload-dropzone-root-operacao-diario relative flex h-full min-h-[90px] cursor-pointer items-center justify-center rounded-xl border border-dashed outline-none transition-all duration-300 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
              padding: "1rem 1.25rem",
              opacity: lendo ? 0.5 : 1,
              pointerEvents: lendo ? "none" : "auto",
              cursor: lendo ? "not-allowed" : "pointer",
            }}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div
                className="relative flex size-11 items-center justify-center"
                aria-hidden="true"
              >
                <span className="upload-dropzone-ring-operacao-diario absolute inset-0 rounded-full" />
                {lendo ? (
                  <IconLoader2
                    size={22}
                    className="relative animate-spin text-muted-foreground motion-reduce:animate-none"
                  />
                ) : (
                  <IconFileSpreadsheet
                    size={22}
                    className="upload-dropzone-glyph-operacao-diario relative"
                  />
                )}
              </div>
              <p className="upload-dropzone-touch-hint-operacao-diario text-[11px] text-muted-foreground/80 sm:hidden">
                Toque para selecionar um CSV
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className={`operacao-diario-portal ${fontVariableClassName}`}
        >
          Arraste um CSV aqui ou clique para selecionar · até 50.000 linhas
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
