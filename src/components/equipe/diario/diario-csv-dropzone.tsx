"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

/**
 * Dropzone do Diário. Replica o padrão visual do upload de
 * /reports/tempo-indisponibilidade (react-dropzone + leitura com detecção de
 * encoding), mas é 100% client-side e independente: só lê o texto do arquivo
 * e devolve por callback. Nenhuma server action, nenhum estado compartilhado
 * com aquela tela.
 */

interface DiarioCsvDropzoneProps {
  onCsv: (csvText: string, fileName: string) => void;
}

export function DiarioCsvDropzone({ onCsv }: DiarioCsvDropzoneProps) {
  const [lendo, setLendo] = useState(false);

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
          toast.error("CSV vazio ou inválido");
          return;
        }

        onCsv(csvText, file.name);
      } catch (err) {
        console.error("[diario-csv-dropzone] erro ao ler arquivo:", err);
        toast.error("Não foi possível ler o arquivo");
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

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      multiple: false,
      disabled: lendo,
    });

  return (
    <div
      {...getRootProps()}
      className="relative flex cursor-pointer items-center justify-center rounded-xl border border-dashed transition-all duration-300 hover:border-primary"
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
        opacity: lendo ? 0.5 : 1,
        pointerEvents: lendo ? "none" : "auto",
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
    </div>
  );
}
