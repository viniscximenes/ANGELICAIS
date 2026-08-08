"use client";

import { useState, useTransition } from "react";
import { IconLoader2, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTemaAction } from "@/lib/db/actions/create-tema-action";
import { deleteTemaAction } from "@/lib/db/actions/delete-tema-action";
import { updateTemaAction } from "@/lib/db/actions/update-tema-action";
import type { Tema, TemaTipo } from "@/lib/db/types";

const TEXTAREA_CLASS =
  "elevation-2 ds-body min-h-20 w-full resize-y rounded-md px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

interface TemaTipoPanelProps {
  tipo: TemaTipo;
  initialTemas: Tema[];
}

export function TemaTipoPanel({ tipo, initialTemas }: TemaTipoPanelProps) {
  const [temas, setTemas] = useState<Tema[]>(initialTemas);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-3">
      {temas.map((tema) => (
        <TemaRow
          key={tema.id}
          tema={tema}
          onUpdated={(updated) =>
            setTemas((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            )
          }
          onDeleted={(id) =>
            setTemas((prev) => prev.filter((t) => t.id !== id))
          }
        />
      ))}

      {temas.length === 0 && !isAdding && (
        <p className="ds-small text-muted-foreground">
          Nenhum tema cadastrado ainda.
        </p>
      )}

      {isAdding ? (
        <TemaForm
          tipo={tipo}
          onCancel={() => setIsAdding(false)}
          onCreated={(created) => {
            setTemas((prev) => [...prev, created]);
            setIsAdding(false);
          }}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
          onClick={() => setIsAdding(true)}
        >
          <IconPlus size={14} aria-hidden="true" />
          Adicionar tema
        </Button>
      )}
    </div>
  );
}

function TemaForm({
  tipo,
  tema,
  onCancel,
  onCreated,
  onUpdated,
}: {
  tipo: TemaTipo;
  tema?: Tema;
  onCancel: () => void;
  onCreated?: (tema: Tema) => void;
  onUpdated?: (tema: Tema) => void;
}) {
  const [nome, setNome] = useState(tema?.nome ?? "");
  const [textoMotivo, setTextoMotivo] = useState(tema?.textoMotivo ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!textoMotivo.trim()) {
      toast.error("Texto do motivo é obrigatório");
      return;
    }

    startTransition(async () => {
      if (tema) {
        const result = await updateTemaAction({
          id: tema.id,
          nome,
          textoMotivo,
        });
        if (result.success) {
          toast.success("Tema atualizado");
          onUpdated?.({ ...tema, nome: nome.trim(), textoMotivo: textoMotivo.trim() });
        } else {
          toast.error("Não foi possível salvar", { description: result.error });
        }
        return;
      }

      const result = await createTemaAction({ tipo, nome, textoMotivo });
      if (result.success) {
        toast.success("Tema criado");
        onCreated?.({
          id: result.id,
          tipo,
          nome: nome.trim(),
          textoMotivo: textoMotivo.trim(),
        });
      } else {
        toast.error("Não foi possível criar", { description: result.error });
      }
    });
  }

  return (
    <div className="elevation-1 space-y-3 rounded-xl p-4">
      <div className="space-y-1.5">
        <label className="ds-mono-sm text-muted-foreground">
          Nome (rótulo no dropdown)
        </label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={isPending}
          placeholder="Ex: Erro de acesso aos sistemas"
        />
      </div>

      <div className="space-y-1.5">
        <label className="ds-mono-sm text-muted-foreground">
          Texto do motivo (completa a frase)
        </label>
        <textarea
          value={textoMotivo}
          onChange={(e) => setTextoMotivo(e.target.value)}
          disabled={isPending}
          className={TEXTAREA_CLASS}
          placeholder="Ex: a um erro em seus acessos aos sistemas de atendimento..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending && (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          )}
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function TemaRow({
  tema,
  onUpdated,
  onDeleted,
}: {
  tema: Tema;
  onUpdated: (tema: Tema) => void;
  onDeleted: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteTemaAction(tema.id);
      if (result.success) {
        setDeleteOpen(false);
        toast.success("Tema apagado");
        onDeleted(tema.id);
      } else {
        toast.error("Não foi possível apagar", { description: result.error });
      }
    });
  }

  if (isEditing) {
    return (
      <TemaForm
        tipo={tema.tipo}
        tema={tema}
        onCancel={() => setIsEditing(false)}
        onUpdated={(updated) => {
          onUpdated(updated);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className="elevation-1 space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <h4 className="ds-body font-semibold">{tema.nome}</h4>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar tema ${tema.nome}`}
            onClick={() => setIsEditing(true)}
          >
            <IconPencil size={14} aria-hidden="true" />
          </Button>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Apagar tema ${tema.nome}`}
              >
                {isDeleting ? (
                  <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <IconTrash size={14} aria-hidden="true" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar o tema &quot;{tema.nome}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Supervisores não vão mais
                  poder escolher esse tema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Apagando..." : "Apagar mesmo assim"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <p className="ds-small text-muted-foreground">{tema.textoMotivo}</p>
    </div>
  );
}
