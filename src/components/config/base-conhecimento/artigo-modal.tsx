"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  IconFileTypePdf,
  IconLoader2,
  IconPaperclip,
  IconPhoto,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/feedback/custom-date-picker";
import { createArtigoAction } from "@/lib/kb/actions/create-artigo-action";
import { updateArtigoAction } from "@/lib/kb/actions/update-artigo-action";
import { validarAnexo } from "@/lib/kb/anexo-validacao";
import type { KbArtigo, KbTipo } from "@/lib/kb/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [palavrasChave, setPalavrasChave] = useState<string[]>([]);
  const [palavraChaveInput, setPalavraChaveInput] = useState("");
  const [isPending, startTransition] = useTransition();

  // Anexo: arquivo novo escolhido nesta sessão do modal (ainda não enviado),
  // e o que já está salvo no artigo (nome + link assinado pra visualizar).
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [anexoExistenteNome, setAnexoExistenteNome] = useState<string | null>(null);
  const [anexoExistenteUrl, setAnexoExistenteUrl] = useState<string | null>(null);
  const [removerAnexoExistente, setRemoverAnexoExistente] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo(artigo?.tipo ?? defaultTipo ?? "artigo");
      setTitulo(artigo?.titulo ?? "");
      setConteudo(artigo?.conteudo ?? "");
      setLink(artigo?.link ?? "");
      setDataPublicacao(artigo?.dataPublicacao ?? "");
      setPalavrasChave(artigo?.palavrasChave ?? []);
      setPalavraChaveInput("");
      setAnexoFile(null);
      setAnexoExistenteNome(artigo?.anexoNome ?? null);
      setAnexoExistenteUrl(artigo?.anexoUrlAssinada ?? null);
      setRemoverAnexoExistente(false);
    }
  }, [open, artigo, defaultTipo]);

  const onDropAnexo = useCallback((acceptedFiles: File[], fileRejections: unknown[]) => {
    if (fileRejections.length > 0) {
      toast.error("Formato não suportado. Use PDF, PNG, JPG, JPEG ou WEBP.");
      return;
    }
    const file = acceptedFiles[0];
    if (!file) return;
    const validacao = validarAnexo(file);
    if (!validacao.valido) {
      toast.error(validacao.erro);
      return;
    }
    setAnexoFile(file);
    setRemoverAnexoExistente(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: abrirSeletorArquivo } = useDropzone({
    onDrop: onDropAnexo,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    multiple: false,
    disabled: isPending,
    noClick: true,
  });

  function removerAnexoSelecionado() {
    setAnexoFile(null);
  }

  function removerAnexoAtual() {
    setAnexoExistenteNome(null);
    setAnexoExistenteUrl(null);
    setRemoverAnexoExistente(true);
  }

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  function addPalavraChave() {
    const clean = palavraChaveInput.trim().toLowerCase();
    if (clean && !palavrasChave.includes(clean)) {
      setPalavrasChave([...palavrasChave, clean]);
    }
    setPalavraChaveInput("");
  }

  function handlePalavraChaveKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPalavraChave();
    } else if (e.key === "Backspace" && !palavraChaveInput && palavrasChave.length > 0) {
      setPalavrasChave(palavrasChave.slice(0, -1));
    }
  }

  function removePalavraChave(termo: string) {
    setPalavrasChave(palavrasChave.filter((t) => t !== termo));
  }

  function handleSubmit() {
    if (!titulo.trim()) return toast.error("Título obrigatório");
    if (!conteudo.trim()) return toast.error("Conteúdo obrigatório");

    startTransition(async () => {
      const input = {
        titulo,
        conteudo,
        palavrasChave,
        tipo,
        link,
        dataPublicacao,
        anexo: anexoFile,
      };
      const r = isEdit
        ? await updateArtigoAction({
            id: artigo.id,
            ...input,
            removerAnexo: removerAnexoExistente,
          })
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

              {tipo === "artigo" && (
                <div>
                  <label className="ds-mono-sm text-muted-foreground mb-1 block">
                    Anexo (PDF ou imagem)
                  </label>

                  {anexoFile ? (
                    <div
                      className="elevation-2 flex items-center justify-between gap-3 rounded-md px-3 py-2"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {anexoFile.name.toLowerCase().endsWith(".pdf") ? (
                          <IconFileTypePdf size={18} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        ) : (
                          <IconPhoto size={18} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        )}
                        <span className="ds-body truncate">{anexoFile.name}</span>
                        <span className="ds-mono-sm text-muted-foreground shrink-0">
                          {formatBytes(anexoFile.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removerAnexoSelecionado}
                        disabled={isPending}
                        aria-label="Remover arquivo selecionado"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <IconTrash size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : anexoExistenteNome && !removerAnexoExistente ? (
                    <div
                      className="elevation-2 flex items-center justify-between gap-3 rounded-md px-3 py-2"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      <a
                        href={anexoExistenteUrl ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ds-body text-primary flex min-w-0 items-center gap-2 truncate underline underline-offset-2 hover:opacity-80"
                      >
                        <IconPaperclip size={18} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{anexoExistenteNome}</span>
                      </a>
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={abrirSeletorArquivo}
                          disabled={isPending}
                          className="ds-mono-sm text-muted-foreground hover:text-foreground"
                        >
                          Substituir
                        </button>
                        <button
                          type="button"
                          onClick={removerAnexoAtual}
                          disabled={isPending}
                          aria-label="Remover anexo"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <IconTrash size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      {...getRootProps()}
                      onClick={abrirSeletorArquivo}
                      className="elevation-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 transition-colors hover:border-primary"
                      style={{
                        borderColor: isDragActive ? "var(--primary)" : "var(--border)",
                        background: isDragActive
                          ? "color-mix(in oklch, var(--primary) 8%, var(--muted))"
                          : undefined,
                      }}
                    >
                      <input {...getInputProps()} />
                      <IconPaperclip size={16} className="text-muted-foreground" aria-hidden="true" />
                      <span className="ds-mono-sm text-muted-foreground">
                        {isDragActive
                          ? "Solte o arquivo aqui"
                          : "Arraste um arquivo ou clique para selecionar (PDF, PNG, JPG, WEBP — até 10MB)"}
                      </span>
                    </div>
                  )}
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

              <div
                className="elevation-2 rounded-xl p-4"
                style={{ border: "1px solid var(--border)" }}
              >
                <label className="ds-mono-sm text-muted-foreground mb-1 block">
                  Palavras-chave para busca
                </label>
                <p className="ds-small text-muted-foreground mb-3">
                  Adicione termos e sinônimos que um gestor poderia usar para
                  procurar esse assunto (ex: para o artigo de Máscaras do
                  Financeiro: &quot;máscara&quot;, &quot;BKO&quot;,
                  &quot;chamado financeiro&quot;, &quot;ocorrência
                  financeira&quot;, &quot;cobrança&quot;,
                  &quot;desconto&quot;). Sem limite de quantidade, mas o ideal
                  é ter pelo menos 3 a 5 por artigo para a busca funcionar
                  bem.
                </p>
                <div
                  className="elevation-1 flex flex-wrap items-center gap-1.5 rounded-md px-2 py-2"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {palavrasChave.map((termo) => (
                    <span
                      key={termo}
                      className="ds-mono-sm text-foreground flex items-center gap-1 rounded-md px-2 py-1"
                      style={{
                        background: "var(--elevation-3-bg)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {termo}
                      <button
                        type="button"
                        onClick={() => removePalavraChave(termo)}
                        disabled={isPending}
                        aria-label={`Remover palavra-chave ${termo}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <IconX size={12} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={palavraChaveInput}
                    onChange={(e) => setPalavraChaveInput(e.target.value)}
                    onKeyDown={handlePalavraChaveKeyDown}
                    onBlur={addPalavraChave}
                    disabled={isPending}
                    placeholder={
                      palavrasChave.length === 0 ? "digite e Enter" : ""
                    }
                    className="ds-mono-sm min-w-[140px] flex-1 bg-transparent px-1 py-1 outline-none"
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
