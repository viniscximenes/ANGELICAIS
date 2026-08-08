"use client";

import { useMemo, useState, useTransition } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconCopy,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TEMPO_LOGADO_MINIMO_SEG } from "@/lib/db/detectar-registros";
import { finalizarRegistroAction } from "@/lib/db/actions/finalizar-registro-action";
import { gerarTexto } from "@/lib/db/gerar-texto";
import type { RegistroComStatus, Tema, TemaTipo } from "@/lib/db/types";
import { formatSecondsAsHHMMSS } from "@/lib/diario/time-format";

interface RegistroRowProps {
  registro: RegistroComStatus;
  dataRef: string;
  agentUser: string;
  agentName: string;
  temas: Tema[];
  onFinalizado: (
    tipo: TemaTipo,
    reasonCode: string | null,
    temaNome: string,
    textoGerado: string,
  ) => void;
}

export function RegistroRow({
  registro,
  dataRef,
  agentUser,
  agentName,
  temas,
  onFinalizado,
}: RegistroRowProps) {
  const [temaId, setTemaId] = useState("");
  const [isPending, startTransition] = useTransition();

  const isPausa = registro.tipo === "pausa";
  const finalizado = registro.finalizado;
  const temaSelecionado = temas.find((t) => t.id === temaId) ?? null;

  const textoPreview = useMemo(() => {
    if (finalizado) return registro.textoGerado;
    if (!temaSelecionado) return null;
    return gerarTexto({
      tipo: registro.tipo,
      agentUsername: agentUser,
      dataRef,
      reasonCode: registro.reason_code,
      duracaoSeg: registro.tempo_seg,
      textoMotivo: temaSelecionado.textoMotivo,
    });
  }, [finalizado, registro, temaSelecionado, agentUser, dataRef]);

  function handleCopy() {
    if (!textoPreview) return;
    navigator.clipboard.writeText(textoPreview);
    toast.success("Copiado!");
  }

  function handleFinalizar() {
    if (!temaSelecionado || !textoPreview) return;

    startTransition(async () => {
      const result = await finalizarRegistroAction({
        dataRef,
        agentUser,
        agentName,
        tipo: registro.tipo,
        reasonCode: registro.reason_code,
        tempoSeg: registro.tempo_seg,
        temaId: temaSelecionado.id,
      });

      if (result.success) {
        toast.success("Registro salvo");
        onFinalizado(
          registro.tipo,
          registro.reason_code,
          result.temaNome,
          result.textoGerado,
        );
      } else {
        toast.error("Não foi possível salvar", { description: result.error });
      }
    });
  }

  return (
    <div
      className="elevation-2 space-y-2 rounded-lg p-3"
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isPausa ? (
            <IconAlertTriangle
              size={14}
              style={{ color: "var(--warning)" }}
              aria-hidden="true"
            />
          ) : (
            <IconClock
              size={14}
              style={{ color: "var(--warning)" }}
              aria-hidden="true"
            />
          )}
          <span className="ds-small font-semibold">
            {isPausa
              ? `Pausa: ${registro.reason_code}`
              : "Tempo Logado"}
          </span>
          <span className="ds-mono-sm text-muted-foreground">
            {isPausa
              ? formatSecondsAsHHMMSS(registro.tempo_seg)
              : `${formatSecondsAsHHMMSS(registro.tempo_seg)} (meta: ${formatSecondsAsHHMMSS(TEMPO_LOGADO_MINIMO_SEG)})`}
          </span>
        </div>

        {finalizado && (
          <span
            className="ds-mono-sm flex items-center gap-1 font-semibold"
            style={{ color: "var(--success)" }}
          >
            <IconCheck size={14} aria-hidden="true" />
            Finalizado
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="ds-mono-sm text-muted-foreground shrink-0">
          Tema
        </label>
        <select
          value={finalizado ? "" : temaId}
          onChange={(e) => setTemaId(e.target.value)}
          disabled={finalizado || isPending}
          className="elevation-1 ds-small flex-1 rounded-md px-2 py-1.5"
          style={{ border: "1px solid var(--border)" }}
        >
          <option value="">
            {finalizado ? registro.temaNome ?? "" : "Selecione um tema..."}
          </option>
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      {textoPreview && (
        <p className="ds-small elevation-1 rounded-md p-2 text-muted-foreground">
          {textoPreview}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!textoPreview}
          className="gap-1.5"
        >
          <IconCopy size={14} aria-hidden="true" />
          Copiar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleFinalizar}
          disabled={!textoPreview || finalizado || isPending}
          className="gap-1.5"
        >
          {isPending ? (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <IconCheck size={14} aria-hidden="true" />
          )}
          {finalizado ? "Finalizado" : isPending ? "Salvando..." : "Finalizar"}
        </Button>
      </div>
    </div>
  );
}
