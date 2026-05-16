"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { finalizeMonitoriaAction } from "@/lib/monitorias/actions/finalize-monitoria-action";
import { updateMonitoriaAction } from "@/lib/monitorias/actions/update-monitoria-action";
import type {
  MonitoriaWithNames,
  NotaAvaliacao,
  SinalizacaoPrincipal,
} from "@/lib/monitorias/types";

import { AutoSaveIndicator } from "./auto-save-indicator";
import { EncaminhouPesquisaGroup } from "./encaminhou-pesquisa-group";
import { RatingRadioGroup } from "./rating-radio-group";
import { SinalizacaoRadioGroup } from "./sinalizacao-radio-group";
import { TextareaResizable } from "./textarea-resizable";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  monitoria: MonitoriaWithNames;
  canFinalize: boolean;
  readonly: boolean;
}

export function MonitoriaForm({ monitoria, canFinalize, readonly }: Props) {
  const router = useRouter();
  const [encaminhou, setEncaminhou] = useState<boolean | null>(
    monitoria.encaminhouPesquisa,
  );
  const [sinalizacao, setSinalizacao] = useState<SinalizacaoPrincipal | null>(
    monitoria.sinalizacaoPrincipal,
  );
  const [notaApr, setNotaApr] = useState<NotaAvaliacao | null>(
    monitoria.notaApresentacao,
  );
  const [notaCom, setNotaCom] = useState<NotaAvaliacao | null>(
    monitoria.notaComunicacao,
  );
  const [notaProc, setNotaProc] = useState<NotaAvaliacao | null>(
    monitoria.notaProcesso,
  );
  const [resumo, setResumo] = useState(monitoria.resumoAtendimento ?? "");

  const [isFinalizing, startFinalize] = useTransition();

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserChangedRef = useRef(false);
  const inFlightRef = useRef<AbortController | null>(null);

  async function performAutoSave() {
    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }
    const controller = new AbortController();
    inFlightRef.current = controller;

    setSaveState("saving");

    try {
      const r = await updateMonitoriaAction({
        id: monitoria.id,
        encaminhouPesquisa: encaminhou,
        sinalizacaoPrincipal: sinalizacao,
        notaApresentacao: notaApr,
        notaComunicacao: notaCom,
        notaProcesso: notaProc,
        resumoAtendimento: resumo.trim() || null,
      });

      if (controller.signal.aborted) return;

      if (r.success) {
        setSaveState("saved");
        setLastSavedAt(new Date());
      } else {
        setSaveState("error");
        toast.error(r.error);
      }
    } catch {
      if (controller.signal.aborted) return;
      setSaveState("error");
      toast.error("Erro ao salvar");
    }
  }

  useEffect(() => {
    if (!hasUserChangedRef.current) {
      hasUserChangedRef.current = true;
      return;
    }

    if (readonly || isFinalizing) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encaminhou, sinalizacao, notaApr, notaCom, notaProc, resumo]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const t = setTimeout(() => setSaveState("idle"), 3000);
    return () => clearTimeout(t);
  }, [saveState]);

  function handleFinalize() {
    if (
      !confirm(
        "Finalizar esta monitoria?\n\nApós finalizada, apenas o ADM poderá editar.",
      )
    ) {
      return;
    }

    startFinalize(async () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      const updateRes = await updateMonitoriaAction({
        id: monitoria.id,
        encaminhouPesquisa: encaminhou,
        sinalizacaoPrincipal: sinalizacao,
        notaApresentacao: notaApr,
        notaComunicacao: notaCom,
        notaProcesso: notaProc,
        resumoAtendimento: resumo.trim() || null,
      });

      if (!updateRes.success) {
        toast.error(updateRes.error);
        return;
      }

      const r = await finalizeMonitoriaAction(monitoria.id);
      if (r.success) {
        toast.success("Monitoria finalizada");
        router.push("/registros/monitoria");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-8">
      {!readonly && (
        <AutoSaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
      )}

      <section className="space-y-2">
        <p className="ds-body font-medium">
          Colaborador encaminhou cliente para pesquisa de satisfação?
        </p>
        <EncaminhouPesquisaGroup
          value={encaminhou}
          onChange={setEncaminhou}
          disabled={readonly || isFinalizing}
        />
      </section>

      <section className="space-y-3">
        <p className="ds-body font-medium">
          Principal sinalização do atendimento
        </p>
        <SinalizacaoRadioGroup
          value={sinalizacao}
          onChange={setSinalizacao}
          disabled={readonly || isFinalizing}
        />
      </section>

      <section className="space-y-5">
        <p className="ds-body font-medium">
          Como você avalia cada fase do atendimento
        </p>

        <RatingRadioGroup
          name="nota_apr"
          label="Apresentação"
          value={notaApr}
          onChange={setNotaApr}
          disabled={readonly || isFinalizing}
        />
        <RatingRadioGroup
          name="nota_com"
          label="Comunicação"
          value={notaCom}
          onChange={setNotaCom}
          disabled={readonly || isFinalizing}
        />
        <RatingRadioGroup
          name="nota_proc"
          label="Processo"
          value={notaProc}
          onChange={setNotaProc}
          disabled={readonly || isFinalizing}
        />
      </section>

      <section className="space-y-2">
        <label
          htmlFor="resumo-atendimento"
          className="ds-body block font-medium"
        >
          Resumo do atendimento
        </label>
        <TextareaResizable
          id="resumo-atendimento"
          value={resumo}
          onChange={setResumo}
          disabled={readonly || isFinalizing}
          placeholder="Descreva o atendimento, pontos positivos, oportunidades de melhoria..."
          initialHeight={180}
        />
        <p className="ds-mono-sm text-muted-foreground">
          Quebras de linha são preservadas.
        </p>
      </section>

      {!readonly && canFinalize && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleFinalize}
            disabled={isFinalizing}
            className="gap-2"
          >
            {isFinalizing ? (
              <IconLoader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <IconCheck size={16} aria-hidden="true" />
            )}
            {isFinalizing ? "Finalizando..." : "Finalizar monitoria"}
          </Button>
        </div>
      )}
    </div>
  );
}
