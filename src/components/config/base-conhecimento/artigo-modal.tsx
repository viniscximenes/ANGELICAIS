"use client";

import { useEffect, useState, useTransition } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/feedback/custom-date-picker";
import { createArtigoAction } from "@/lib/kb/actions/create-artigo-action";
import { updateArtigoAction } from "@/lib/kb/actions/update-artigo-action";
import type { KbArtigo, KbTipo } from "@/lib/kb/types";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  artigo?: KbArtigo;
  defaultTipo?: KbTipo;
}

export function ArtigoModal({ open, onClose, artigo, defaultTipo }: Props) {
  const router = useRouter();
  const isEdit = !!artigo;

  const [tipo, setTipo] = useState<KbTipo>("artigo");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [link, setLink] = useState("");
  const [dataPublicacao, setDataPublicacao] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTipo(artigo?.tipo ?? defaultTipo ?? "artigo");
      setTitulo(artigo?.titulo ?? "");
      setConteudo(artigo?.conteudo ?? "");
      setLink(artigo?.link ?? "");
      setDataPublicacao(artigo?.dataPublicacao ?? "");
      setTags(artigo?.tags ?? []);
      setTagInput("");
    }
  }, [open, artigo, defaultTipo]);

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  function addTag() {
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSubmit() {
    if (!titulo.trim()) return toast.error("Título obrigatório");
    if (!conteudo.trim()) return toast.error("Conteúdo obrigatório");

    startTransition(async () => {
      const input = { titulo, conteudo, tags, tipo, link, dataPublicacao };
      const r = isEdit
        ? await updateArtigoAction({ id: artigo.id, ...input })
        : await createArtigoAction(input);

      if (r.success) {
        toast.success(
          isEdit
            ? tipo === "artigo"
              ? "Artigo atualizado"
              : "Instrução atualizada"
            : tipo === "artigo"
              ? "Artigo criado"
              : "Instrução criada",
        );
        onClose();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const titulo2 = isEdit
    ? tipo === "artigo"
      ? "Editar artigo"
      : "Editar instrução"
    : tipo === "artigo"
      ? "Novo artigo"
      : "Nova instrução";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background:
              "color-mix(in oklch, var(--background) 80%, transparent)",
            backdropFilter: "blur(8px)",
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="elevation-3 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            style={{ border: "1px solid var(--border)" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="ds-h2" style={{ fontSize: "1.25rem" }}>
                {titulo2}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground rounded-md p-1"
                aria-label="Fechar"
              >
                <IconX size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Tipo
                </label>
                <div
                  className="elevation-2 inline-flex rounded-md p-0.5"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {(["artigo", "instrucao"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      disabled={isPending}
                      className="ds-mono-sm rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 transition-colors"
                      style={{
                        background:
                          tipo === t ? "var(--primary)" : "transparent",
                        color:
                          tipo === t
                            ? "var(--primary-foreground)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {t === "artigo" ? "Artigo" : "Instrução"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Título
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={isPending}
                  placeholder={
                    tipo === "artigo"
                      ? "Como fazer retenção por financeiro"
                      : "Como responder sobre descontos"
                  }
                  className="elevation-2 ds-body w-full rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>

              {tipo === "artigo" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="ds-mono-sm text-muted-foreground mb-1 block">
                      Link
                    </label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      disabled={isPending}
                      placeholder="https://base.alloha.com/artigo/123"
                      className="elevation-2 ds-body w-full rounded-md px-3 py-2"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  </div>

                  <CustomDatePicker
                    label="Data de publicação"
                    value={dataPublicacao}
                    onChange={setDataPublicacao}
                  />
                </div>
              )}

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  {tipo === "artigo" ? "Conteúdo" : "Descrição"}
                </label>
                <textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  disabled={isPending}
                  placeholder={
                    tipo === "artigo"
                      ? "Descreva o procedimento em detalhes..."
                      : "Descreva como a IA deve se comportar..."
                  }
                  rows={12}
                  className="elevation-2 ds-body w-full resize-y rounded-md px-3 py-2"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Tags
                </label>
                <div
                  className="elevation-2 flex flex-wrap items-center gap-1.5 rounded-md px-2 py-2"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="ds-mono-sm text-foreground flex items-center gap-1 rounded-md px-2 py-1"
                      style={{
                        background: "var(--elevation-3-bg)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        disabled={isPending}
                        aria-label={`Remover tag ${tag}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <IconX size={12} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={addTag}
                    disabled={isPending}
                    placeholder={tags.length === 0 ? "digite e Enter" : ""}
                    className="ds-mono-sm min-w-[100px] flex-1 bg-transparent px-1 py-1 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="gap-2"
              >
                {isPending && (
                  <IconLoader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
