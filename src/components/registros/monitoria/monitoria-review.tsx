"use client";

import { useTransition } from "react";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { sendMonitoriaAction } from "@/lib/monitorias/actions/send-monitoria-action";
import { labelNota, labelSinalizacao } from "@/lib/monitorias/format-labels";
import type { MonitoriaWithNames } from "@/lib/monitorias/types";

import { CopyButton } from "./copy-button";

interface Props {
  monitoria: MonitoriaWithNames;
  canSend: boolean;
}

export function MonitoriaReview({ monitoria, canSend }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (
      !confirm(
        "Marcar como enviada ao Forms?\n\nApós isso, ninguém poderá mais editar esta monitoria.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const r = await sendMonitoriaAction(monitoria.id);
      if (r.success) {
        toast.success("Monitoria marcada como enviada");
        router.push("/registros/monitoria");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <FieldRow label="ID da Chamada" value={monitoria.idChamada} copyable />

      <FieldRow label="Contrato" value={monitoria.contratoCliente} copyable />

      <FieldRow
        label="Encaminhou cliente para pesquisa?"
        value={
          monitoria.encaminhouPesquisa === true
            ? "Sim"
            : monitoria.encaminhouPesquisa === false
              ? "Não"
              : "—"
        }
      />

      <FieldRow
        label="Principal sinalização"
        value={labelSinalizacao(monitoria.sinalizacaoPrincipal)}
      />

      <section className="space-y-2">
        <p className="ds-mono-sm text-muted-foreground tracking-wider">
          AVALIAÇÕES
        </p>
        <div className="elevation-1 space-y-2 rounded-lg p-4">
          <div className="ds-body flex items-center justify-between">
            <span className="text-muted-foreground">Apresentação</span>
            <span>{labelNota(monitoria.notaApresentacao)}</span>
          </div>
          <div className="ds-body flex items-center justify-between">
            <span className="text-muted-foreground">Comunicação</span>
            <span>{labelNota(monitoria.notaComunicacao)}</span>
          </div>
          <div className="ds-body flex items-center justify-between">
            <span className="text-muted-foreground">Processo</span>
            <span>{labelNota(monitoria.notaProcesso)}</span>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="ds-mono-sm text-muted-foreground tracking-wider">
            RESUMO DO ATENDIMENTO
          </p>
          {monitoria.resumoAtendimento && (
            <CopyButton
              text={monitoria.resumoAtendimento}
              label="Copiar resumo"
            />
          )}
        </div>
        <div
          className="elevation-1 ds-body rounded-lg p-4"
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            minHeight: "120px",
          }}
        >
          {monitoria.resumoAtendimento || (
            <span className="text-muted-foreground italic">Sem resumo</span>
          )}
        </div>
      </section>

      {canSend && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <IconLoader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <IconSend size={16} aria-hidden="true" />
            )}
            {isPending ? "Enviando..." : "Finalizar e enviar ao Forms"}
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="ds-mono-sm text-muted-foreground tracking-wider">
        {label.toUpperCase()}
      </p>
      <div className="elevation-1 flex items-center justify-between gap-3 rounded-lg px-4 py-3">
        <p className="ds-body">{value}</p>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}
