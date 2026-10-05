"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { uploadConsolidadoAction } from "@/lib/d1-db/actions/upload-consolidado-action";
import { useFaviconLoading } from "@/lib/favicon/use-favicon-loading";
import { notifyBaseAtualizada } from "@/lib/retencao/base-cleared-event";
import { ReactBitsFolder } from "@/components/ui/react-bits-folder";
import { handleStaleActionError } from "@/lib/utils/handle-stale-action-error";
import { UploadProgressModal } from "./upload-progress-modal";

export type UploadStep =
  | "attaching"
  | "deleting"
  | "replacing"
  | "done"
  | null;

interface UploadDropzoneProps {
  /**
   * Clique/teclado abre o seletor de arquivos já na pasta Downloads e só com
   * .csv (sem a opção "Todos os arquivos"), via File System Access API
   * (showOpenFilePicker — Chrome/Edge). Navegadores sem a API seguem com o
   * seletor padrão de sempre. Arrastar e soltar não muda. Default false —
   * só /s/reports/consolidado (GestorEquipeSection) ativa.
   */
  abrirEmDownloads?: boolean;
  /**
   * Ao concluir, recarrega a página com o modal de progresso AINDA aberto,
   * em vez de fechar o modal e depois recarregar. Sem isso, o fechamento
   * era pintado antes da recarga e a tabela antiga aparecia por um instante
   * entre o modal e o skeleton do loading.tsx. Default false — só
   * /s/reports/consolidado ativa (fluxo: modal → skeleton → tabela).
   */
  recarregarComModalAberto?: boolean;
}

// Tipagem mínima da File System Access API (não está no lib.dom do TS).
type ShowOpenFilePicker = (options: {
  startIn?: "downloads";
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}) => Promise<{ getFile: () => Promise<File> }[]>;

export function UploadDropzone({
  abrirEmDownloads = false,
  recarregarComModalAberto = false,
}: UploadDropzoneProps = {}) {
  // Detectado só no client (evita divergência de hidratação com o SSR).
  const [pickerNativo, setPickerNativo] = useState(false);
  useEffect(() => {
    setPickerNativo(abrirEmDownloads && "showOpenFilePicker" in window);
  }, [abrirEmDownloads]);
  const [step, setStep] = useState<UploadStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsWritten, setRowsWritten] = useState<number>(0);
  const [isHovering, setIsHovering] = useState(false);

  // Executa o upload de fato (etapas + action + reload).
  const processUpload = useCallback(async (csvText: string) => {
    setStep("deleting");
    await new Promise((r) => setTimeout(r, 400));

    setStep("replacing");

    let uploadResult;
    try {
      uploadResult = await uploadConsolidadoAction(csvText);
    } catch (err) {
      setStep(null);
      // Server Action de um build anterior (hot reload em dev, ou deploy
      // novo em produção com a aba aberta) — avisa e recarrega em vez de
      // deixar o upload falhar silenciosamente no console.
      if (handleStaleActionError(err)) return;
      setErrorMessage("Erro inesperado ao enviar a base.");
      toast.error("Falha ao atualizar base", {
        className: "reports-consolidado-toast",
      });
      console.error("[upload] action error:", err);
      return;
    }

    if (!uploadResult.success) {
      setStep(null);
      setErrorMessage(uploadResult.error);
      toast.error("Falha ao atualizar base", {
        description: uploadResult.error,
        className: "reports-consolidado-toast",
      });
      return;
    }

    setRowsWritten(uploadResult.rowsWritten);
    setStep("done");

    // Gatilho específico do upload concluído (não polling): uploadConsolidadoAction
    // grava retencao_atendimentos E d1_consolidado na mesma chamada, mas só a
    // EquipeTable tem polling próprio — o trilho horizontal (RetencaoDetalheSection)
    // busca retencao_atendimentos uma única vez no mount e só refaria essa busca
    // com um F5 manual (revalidatePath, chamado dentro da action, invalida cache de
    // Server Component, não um fetch client-side feito à mão). Ver base-cleared-event.ts.
    notifyBaseAtualizada();

    // Sem o popup de convite pro Comparativo (removido a pedido — as
    // equipes já conhecem a página): todo upload segue direto pro reload.
    setTimeout(() => {
      if (!recarregarComModalAberto) setStep(null);
      window.location.reload();
    }, 3000);
  }, [recarregarComModalAberto]);

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
            toast.error("CSV inválido", { className: "reports-consolidado-toast" });
            return;
          }

          const rows = result.data.filter((row) =>
            row.some((cell) => cell !== ""),
          );

          if (rows.length < 2) {
            setStep(null);
            setErrorMessage("CSV vazio ou só com cabeçalho.");
            toast.error("CSV vazio", { className: "reports-consolidado-toast" });
            return;
          }

          // Delay pra UX mostrar a etapa "ANEXANDO"
          await new Promise((r) => setTimeout(r, 600));

          await processUpload(csvText);
        },
        error: (err: Error) => {
          setStep(null);
          setErrorMessage(err.message);
          toast.error("Erro ao processar arquivo", { className: "reports-consolidado-toast" });
        },
        skipEmptyLines: true,
      });
    } catch (err) {
      setStep(null);
      setErrorMessage("Erro ao ler arquivo");
      toast.error("Não foi possível ler o arquivo", { className: "reports-consolidado-toast" });
      console.error("[upload] read error:", err);
    }
  }, [processUpload]);

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
  // Favicon animado ("carregando") durante upload/substituição/exclusão da
  // base Consolidado — step volta pra null em todo caminho de erro (ver
  // handleStaleActionError/catch abaixo), então isProcessing já cobre erro
  // certinho, sem precisar de tratamento à parte.
  useFaviconLoading(isProcessing);

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
    "Anexar base CSV. Arraste um arquivo ou clique para selecionar. Apenas arquivos .csv, limite de 10.000 linhas.";

  const dropzoneState = isProcessing
    ? "processing"
    : isDragReject
      ? "reject"
      : isDragActive
        ? "active"
        : "idle";

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
        className="upload-dropzone-root-reports-consolidado relative flex h-full cursor-pointer items-center justify-center rounded-xl border border-dashed outline-none transition-all duration-300 hover:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        style={{
                // Tokens PRÓPRIOS desta página (reports-consolidado.css), com
                // color-mix a partir de --card/--muted — mesma técnica do
                // StyledCard, mas com um tom mais escuro/definido que o fundo
                // do card ao redor, pra área de drop se distinguir claramente
                // no tema claro (antes ficava quase idêntica ao card, "muito
                // branca"). Fallback pro --card cobre qualquer falha de load
                // do CSS escopado.
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
          <p className="upload-dropzone-touch-hint-reports-consolidado ds-mono-sm text-muted-foreground/80 text-[11px] sm:hidden">
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

      <UploadProgressModal step={step} rowsWritten={rowsWritten} variant="reports-consolidado" />
    </>
  );
}
