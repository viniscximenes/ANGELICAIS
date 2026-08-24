"use client";

import { useState, useTransition } from "react";
import {
  IconArticle,
  IconCalendarEvent,
  IconClipboardText,
  IconLink,
  IconLoader2,
  IconPaperclip,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteArtigoAction } from "@/lib/kb/actions/delete-artigo-action";
import type { KbArtigo } from "@/lib/kb/types";

import { ArtigoModal } from "./artigo-modal";

interface Props {
  artigo: KbArtigo;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function KbArtigoRow({ artigo }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const r = await deleteArtigoAction(artigo.id);
      if (r.success) {
        toast.success(
          artigo.tipo === "artigo" ? "Artigo excluído" : "Instrução excluída",
        );
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <div
        className="flex items-start justify-between gap-4 border-b px-4 py-4 last:border-b-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            {artigo.tipo === "artigo" ? (
              <IconArticle
                size={15}
                className="text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            ) : (
              <IconClipboardText
                size={15}
                className="text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            )}
            <p className="ds-body font-medium">{artigo.titulo}</p>
          </div>

          {artigo.link && (
            <a
              href={artigo.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-mono-sm text-primary flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
            >
              <IconLink size={12} aria-hidden="true" />
              {artigo.link}
            </a>
          )}

          {artigo.anexoNome && (
            <a
              href={artigo.anexoUrlAssinada ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-mono-sm text-primary flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
              title="Abrir anexo — a IA cita este arquivo como fonte em vez do link acima"
            >
              <IconPaperclip size={12} aria-hidden="true" />
              {artigo.anexoNome}
            </a>
          )}

          {artigo.dataPublicacao && (
            <p className="ds-mono-sm text-muted-foreground flex items-center gap-1">
              <IconCalendarEvent size={12} aria-hidden="true" />
              Publicado em {formatDate(artigo.dataPublicacao)}
            </p>
          )}

          {artigo.palavrasChave.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {artigo.palavrasChave.map((termo) => (
                <span
                  key={termo}
                  className="ds-mono-sm text-muted-foreground rounded-md px-2 py-0.5"
                  style={{
                    background: "var(--elevation-2-bg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {termo}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="text-muted-foreground hover:text-foreground elevation-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors"
            style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            aria-label="Editar"
          >
            <IconPencil size={14} aria-hidden="true" />
            <span className="ds-mono-sm">Editar</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:bg-destructive/10 elevation-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
            style={{ border: "1px solid var(--border)", fontSize: "12px" }}
            aria-label="Excluir"
          >
            {isDeleting ? (
              <IconLoader2
                size={14}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <IconTrash size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <ArtigoModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        artigo={artigo}
      />
    </>
  );
}
