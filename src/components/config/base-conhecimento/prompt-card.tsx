"use client";

import { useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateConfigAction } from "@/lib/kb/actions/update-config-action";

interface Props {
  promptInicial: string;
}

export function PromptCard({ promptInicial }: Props) {
  const [prompt, setPrompt] = useState(promptInicial);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!prompt.trim()) return toast.error("Prompt não pode ficar vazio");

    startTransition(async () => {
      const r = await updateConfigAction(prompt);
      if (r.success) {
        toast.success("Prompt salvo");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-5">
      <div className="space-y-0.5">
        <h2 className="ds-h3">Prompt da IA</h2>
        <p className="ds-small text-muted-foreground">
          Este texto define como a IA se comporta ao responder perguntas.
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isPending}
        rows={8}
        className="elevation-2 ds-body w-full resize-y rounded-md px-3 py-2"
        style={{ border: "1px solid var(--border)" }}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending && (
            <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          {isPending ? "Salvando..." : "Salvar prompt"}
        </Button>
      </div>
    </div>
  );
}
