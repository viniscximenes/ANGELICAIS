"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconSparkles } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seedTemasPadraoAction } from "@/lib/db/actions/seed-temas-action";
import type { Tema } from "@/lib/db/types";
import { TemaTipoPanel } from "./tema-tipo-panel";

interface TemasConfigSectionProps {
  temasPausa: Tema[];
  temasTempoLogado: Tema[];
  mostrarSeed: boolean;
}

export function TemasConfigSection({
  temasPausa,
  temasTempoLogado,
  mostrarSeed,
}: TemasConfigSectionProps) {
  const [seedDone, setSeedDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await seedTemasPadraoAction();
      if (result.success) {
        toast.success(`${result.inseridos} temas padrão carregados`);
        setSeedDone(true);
        window.location.reload();
      } else {
        toast.error("Não foi possível carregar os temas padrão", {
          description: result.error,
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      {mostrarSeed && !seedDone && (
        <div className="elevation-1 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <p className="ds-small text-muted-foreground">
            Nenhum tema cadastrado ainda. Carregue os temas padrão pra
            começar (10 de pausa + 2 de tempo logado) e ajuste depois.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleSeed}
            disabled={isPending}
            className="shrink-0 gap-1.5"
          >
            {isPending ? (
              <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <IconSparkles size={14} aria-hidden="true" />
            )}
            Carregar temas padrão
          </Button>
        </div>
      )}

      <Tabs defaultValue="pausa">
        <TabsList className="bg-muted/40 p-1 border border-border/60 rounded-xl gap-1">
          <TabsTrigger
            value="pausa"
            className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground cursor-pointer"
          >
            Temas de Pausa
          </TabsTrigger>
          <TabsTrigger
            value="tempo_logado"
            className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground cursor-pointer"
          >
            Temas de Tempo Logado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pausa" className="pt-4">
          <TemaTipoPanel tipo="pausa" initialTemas={temasPausa} />
        </TabsContent>

        <TabsContent value="tempo_logado" className="pt-4">
          <TemaTipoPanel tipo="tempo_logado" initialTemas={temasTempoLogado} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
