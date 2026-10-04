"use client";

import { useMemo, useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { KpiFrame } from "@/app/(dashboard)/s/kpi/operadores/_components/kpi-frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { salvarPausasAction } from "@/lib/bases/pausas-programadas/actions/salvar-pausas-action";
import { parsePausasClipboard } from "@/lib/bases/pausas-programadas/parse-pausas-clipboard";
import { useFaviconLoading } from "@/lib/favicon/use-favicon-loading";

export function PausasPasteForm() {
  const router = useRouter();
  const [clipboardText, setClipboardText] = useState("");
  const [isPending, startTransition] = useTransition();
  // Favicon animado ("carregando") enquanto salva as pausas.
  useFaviconLoading(isPending);

  const { linhas, ignoradas } = useMemo(
    () => parsePausasClipboard(clipboardText),
    [clipboardText],
  );

  function handleSalvar() {
    if (linhas.length === 0) {
      toast.error("Cole os dados primeiro");
      return;
    }

    startTransition(async () => {
      const result = await salvarPausasAction(linhas);

      if (result.success) {
        toast.success(`${result.total} operadores salvos`);
        setClipboardText("");
        router.refresh();
      } else {
        toast.error("Falha ao salvar", { description: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Mesmo campo de /s/bases/kpi: sem título, o placeholder explica o que
          fazer e o envio fica dentro do campo, no canto inferior direito. */}
      <div className="relative">
        <textarea
          id="pausas-textarea"
          aria-label="Colar pausas programadas"
          value={clipboardText}
          onChange={(e) => setClipboardText(e.target.value)}
          disabled={isPending}
          rows={4}
          placeholder="Cole aqui a base de pausas programadas (Ctrl+V)"
          className="bases-pausas-colar font-sans placeholder:text-muted-foreground/70 w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 pt-3 pb-12 text-sm text-foreground disabled:opacity-60"
          style={{ resize: "none", minHeight: "120px" }}
        />
        <button
          type="button"
          onClick={handleSalvar}
          disabled={isPending || linhas.length === 0}
          className="font-sans bg-primary text-primary-foreground absolute right-3 bottom-3 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-opacity cursor-pointer select-none hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending && (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          )}
          {isPending ? "Processando..." : "Enviar dados"}
        </button>
      </div>

      {ignoradas > 0 && (
        <p className="font-sans text-sm" style={{ color: "var(--warning)" }}>
          {ignoradas} linha{ignoradas === 1 ? "" : "s"} ignorada
          {ignoradas === 1 ? "" : "s"} (faltam agente, login ou logout).
        </p>
      )}

      {linhas.length > 0 && (
        <div className="space-y-2">
          <p className="font-sans text-sm text-muted-foreground">
            Preview: {linhas.length} operador{linhas.length === 1 ? "" : "es"} detectado
            {linhas.length === 1 ? "" : "s"}
          </p>

          {/* Cantoneiras + cabeçalho no padrão do Consolidado (bases-pausas.css). */}
          <KpiFrame>
            <div className="max-h-[320px] overflow-y-auto">
              <Table data-tabela-pausas>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {["Agente", "Célula", "Login", "Logout", "D1", "P20", "D2"].map((h) => (
                      <TableHead key={h} className="px-3 py-3 align-middle">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.operatorEmail} className="hover:bg-transparent">
                      <TableCell className="px-3 py-2.5 align-middle font-medium">
                        {l.operatorEmail}
                      </TableCell>
                      <TableCell className="text-muted-foreground px-3 py-2.5 align-middle">
                        {l.celula || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle tabular-nums">
                        {l.horaLogin || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle tabular-nums">
                        {l.horaLogout || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground px-3 py-2.5 align-middle tabular-nums">
                        {l.descanso1 || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground px-3 py-2.5 align-middle tabular-nums">
                        {l.pausa20 || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground px-3 py-2.5 align-middle tabular-nums">
                        {l.descanso2 || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </KpiFrame>
        </div>
      )}
    </div>
  );
}
