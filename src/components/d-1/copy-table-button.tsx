"use client";

import { useState } from "react";
import { IconCamera, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { OperadorConsolidado, ResumoEquipe } from "@/lib/google/d1";

const META_TX = 0.6;

function formatTxPercent(tx: number | null): string {
  if (tx === null) return "—";
  return `${(tx * 100).toFixed(1)}%`;
}

function meetsMeta(tx: number): boolean {
  return Math.round(tx * 1000) >= Math.round(META_TX * 1000);
}

function usernameFromEmail(email: string): string {
  return email.split("@")[0] || email;
}

type ReportSections = {
  hora: string;
  tail:
    | { kind: "urgent"; ops: Array<{ name: string; tx: string }> }
    | { kind: "celebration" }
    | { kind: "none" };
};

function buildReportSections(
  operadores: OperadorConsolidado[],
  equipe: ResumoEquipe,
): ReportSections {
  const hora =
    equipe.horaReport && equipe.horaReport !== "—" ? equipe.horaReport : "—";

  const withAtendimentos = operadores.filter(
    (op) => op.pedidos > 0 && op.txRetencao !== null,
  );

  // Abaixo da meta, ordenados do mais crítico (menor TX) pro maior
  const belowMeta = withAtendimentos
    .filter((op) => !meetsMeta(op.txRetencao!))
    .sort((a, b) => a.txRetencao! - b.txRetencao!);

  if (belowMeta.length > 0) {
    return {
      hora,
      tail: {
        kind: "urgent",
        ops: belowMeta.map((op) => ({
          name: usernameFromEmail(op.email),
          tx: formatTxPercent(op.txRetencao),
        })),
      },
    };
  }
  if (withAtendimentos.length > 0) {
    return { hora, tail: { kind: "celebration" } };
  }
  return { hora, tail: { kind: "none" } };
}

function formatReportPlain(s: ReportSections): string {
  const lines = [
    "📊 REPORT CONSOLIDADO",
    `Atualizado às ${s.hora}`,
    "",
  ];
  if (s.tail.kind === "urgent") {
    lines.push(
      "🚨 URGENTE 🚨",
      "Operadores abaixo precisam de suporte para subir a taxa no mínimo a 60%, conto com a equipe para suporte:",
      ...s.tail.ops.map((o) => `• ${o.name} — ${o.tx}`),
    );
  } else if (s.tail.kind === "celebration") {
    lines.push("✅✅✅ Equipe toda acima da meta. Continuem assim! ✅✅✅");
  }
  return lines.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReportHtml(s: ReportSections, pngDataUrl: string): string {
  const parts: string[] = [
    `<strong>📊 REPORT CONSOLIDADO</strong><br>`,
    `Atualizado às ${escapeHtml(s.hora)}<br>`,
    `<br>`,
    `<img src="${pngDataUrl}" style="max-width:600px;" alt="Tabela consolidado"><br>`,
    `<br>`,
  ];
  if (s.tail.kind === "urgent") {
    parts.push(
      `<strong>🚨 <em>URGENTE</em> 🚨</strong><br>`,
      `<em>Operadores abaixo precisam de suporte para subir a taxa no mínimo a 60%, conto com a equipe para suporte:</em><br>`,
      ...s.tail.ops.map(
        (o) =>
          `• <strong>${escapeHtml(o.name.toUpperCase())}</strong> — ${escapeHtml(o.tx)}<br>`,
      ),
    );
  } else if (s.tail.kind === "celebration") {
    parts.push(
      `✅✅✅ <strong>Equipe toda acima da meta. Continuem assim!</strong> ✅✅✅`,
    );
  }
  return `<div>${parts.join("")}</div>`;
}

interface CopyTableButtonProps {
  operadores: OperadorConsolidado[];
  equipe: ResumoEquipe;
}

export function CopyTableButton({
  operadores,
  equipe,
}: CopyTableButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "done">("idle");

  async function handleCopy() {
    const target = document.querySelector<HTMLElement>("[data-equipe-table]");

    if (!target) {
      toast.error("Tabela não encontrada");
      return;
    }

    setState("copying");

    try {
      // PNG segue o tema ativo do usuário (background do elemento é capturado naturalmente).
      const pngDataUrl = await domToPng(target, { scale: 2 });

      // Converte pra Blob
      const blobResponse = await fetch(pngDataUrl);
      const imageBlob = await blobResponse.blob();

      const sections = buildReportSections(operadores, equipe);
      const reportPlain = formatReportPlain(sections);
      const reportHtml = formatReportHtml(sections, pngDataUrl);

      const clipboardItem = new ClipboardItem({
        "image/png": imageBlob,
        "text/html": new Blob([reportHtml], { type: "text/html" }),
        "text/plain": new Blob([reportPlain], { type: "text/plain" }),
      });

      await navigator.clipboard.write([clipboardItem]);

      setState("done");
      toast.success("Tabela copiada", {
        description: "Cole no Teams, Slack ou email (Ctrl+V)",
        duration: 2500,
      });

      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("[copy-table] erro:", err);
      setState("idle");

      // Fallback: só imagem
      try {
        const pngDataUrl = await domToPng(target, { scale: 2 });
        const blobResponse = await fetch(pngDataUrl);
        const imageBlob = await blobResponse.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": imageBlob }),
        ]);
        toast.success("Imagem copiada");
      } catch {
        toast.error("Não foi possível copiar", {
          description: "Tente em outro navegador (Chrome/Edge)",
        });
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      disabled={state === "copying"}
      className="gap-2"
    >
      {state === "copying" && (
        <>
          <IconLoader2
            size={16}
            className="animate-spin"
            aria-hidden="true"
          />
          Gerando...
        </>
      )}
      {state === "done" && (
        <>
          <IconCheck
            size={16}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          Copiado
        </>
      )}
      {state === "idle" && (
        <>
          <IconCamera size={16} aria-hidden="true" />
          Copiar como imagem
        </>
      )}
    </Button>
  );
}
