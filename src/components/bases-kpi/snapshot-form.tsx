"use client";

import { useState, useTransition } from "react";
import {
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { useFaviconLoading } from "@/lib/favicon/use-favicon-loading";
import {
  processSnapshotAction,
  type ProcessSnapshotResult,
} from "@/lib/kpi/bases/process-snapshot-action";
import { registrarKpiOperadoresAtualizacaoAction } from "@/lib/kpi/atualizacoes/registrar-atualizacao-action";

import {
  OverrideMappingModal,
  type MissingKpiInfo,
} from "./override-mapping-modal";
import { SnapshotResult } from "./snapshot-result";

interface SnapshotFormProps {
  dataCorte: string;
  /** Mês de referência — derivado da data de corte ("YYYY-MM-01"). */
  effectiveMesRef: string;
  isPastMonth: boolean;
}

export function SnapshotForm({
  dataCorte,
  effectiveMesRef,
  isPastMonth,
}: SnapshotFormProps) {

  const [clipboardText, setClipboardText] = useState("");
  const [result, setResult] = useState<ProcessSnapshotResult | null>(null);
  const [isPending, startTransition] = useTransition();
  // Favicon animado ("carregando") enquanto o upload/processamento estiver
  // em andamento — cleanup do useEffect roda mesmo se isPending virar false
  // por causa de um catch/erro, então cobre sucesso e falha igual.
  useFaviconLoading(isPending);
  const [missingKpisForModal, setMissingKpisForModal] = useState<
    MissingKpiInfo[]
  >([]);
  const [detectedHeadersForModal, setDetectedHeadersForModal] = useState<
    string[]
  >([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function processWithOverrides(overrides?: Record<string, string>) {
    const res = await processSnapshotAction({
      clipboardText,
      mesRef: effectiveMesRef,
      dataCorte,
      headerOverrides: overrides,
    });

    setResult(res);

    if (res.success) {
      // Aba OPERADORES: avisa os gestores que o KPI foi atualizado até a
      // data de corte. Neste ponto o snapshot JÁ foi gravado no banco (o
      // upsert roda antes da checagem de headers em processSnapshotAction),
      // então notificamos em TODO sucesso — inclusive quando o modal de
      // mapeamento de header abre — pra não deixar base salva sem aviso caso
      // o ADM não conclua o modal. O reprocessamento com overrides chama de
      // novo, mas a action faz dedupe por data_referencia. É awaited (não
      // fire-and-forget) pra não ser abortada pelo refresh de RSC do
      // revalidatePath e pra o erro real aparecer no log do servidor.
      // (A aba Gestores usa GestorSnapshotForm e não chama isto.)
      await registrarKpiOperadoresAtualizacaoAction(dataCorte);

      if (res.missingKpis.length > 0 && !overrides) {
        setMissingKpisForModal(res.missingKpisFull);
        setDetectedHeadersForModal(res.detectedHeaders);
        setModalOpen(true);
        toast.warning("Alguns KPIs não foram encontrados", {
          description: "Ajuste os nomes no modal que apareceu.",
        });
      } else {
        toast.success("Snapshot processado", {
          description: `${res.totalOperators} operadores salvos`,
        });
        setClipboardText("");
        setModalOpen(false);
      }
    } else {
      toast.error("Falha ao salvar", { description: res.error });
    }
  }

  function handleSubmit() {
    if (!effectiveMesRef) {
      toast.error("Selecione um mês válido");
      return;
    }

    if (!clipboardText.trim()) {
      toast.error("Cole os dados primeiro");
      return;
    }

    startTransition(async () => {
      await processWithOverrides();
    });
  }

  function handleReprocessWithOverrides(overrides: Record<string, string>) {
    startTransition(async () => {
      await processWithOverrides(overrides);
    });
  }

  return (
    <div className="space-y-4">
      {/* Data de corte fica na linha de controles (BasesKpiCards); aqui só o
          aviso de mês fechado, renderizado apenas quando se aplica. */}
      {isPastMonth && effectiveMesRef && (
        <div
          className="flex items-start gap-2 rounded-md p-3"
          style={{
            background:
              "color-mix(in oklch, var(--warning) 12%, transparent)",
            border:
              "1px solid color-mix(in oklch, var(--warning) 35%, transparent)",
          }}
          role="alert"
        >
          <IconAlertTriangle
            size={16}
            style={{
              color: "var(--warning)",
              flexShrink: 0,
              marginTop: "2px",
            }}
            aria-hidden="true"
          />
          <p className="ds-mono-sm" style={{ color: "var(--warning)" }}>
            Você está colando dados de um mês fechado. Os valores atuais
            desse mês serão sobrescritos.
          </p>
        </div>
      )}

      {/* Sem animação de entrada: depois do skeleton o campo só aparece. */}
      <div>
        {/* Sem título: o próprio campo explica o que fazer (placeholder) e o
            botão de envio fica dentro dele, no canto inferior direito. */}
        <div className="relative">
          <textarea
            id="clipboard-textarea"
            aria-label="Colar KPI de operadores"
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="Cole aqui a base de KPI de operadores (Ctrl+V)"
            className="bases-kpi-colar font-sans placeholder:text-muted-foreground/70 w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 pt-3 pb-12 text-sm text-foreground disabled:opacity-60"
            style={{ resize: "none", minHeight: "120px" }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !effectiveMesRef}
            className="font-sans bg-primary text-primary-foreground absolute right-3 bottom-3 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-opacity cursor-pointer select-none hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending && (
              <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
            )}
            {isPending ? "Processando..." : "Enviar dados"}
          </button>
        </div>
      </div>

      {result && <SnapshotResult result={result} />}

      <OverrideMappingModal
        open={modalOpen}
        missingKpis={missingKpisForModal}
        detectedHeaders={detectedHeadersForModal}
        onCancel={() => setModalOpen(false)}
        onReprocess={handleReprocessWithOverrides}
        isPending={isPending}
      />
    </div>
  );
}
