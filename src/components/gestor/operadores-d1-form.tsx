"use client";

import { useState } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adicionarOperadorAction,
  excluirOperadorAction,
} from "@/lib/d1-db/actions/operadores-gestor-actions";
import type { OperadorD1 } from "@/lib/d1-db/types";

// Mesma regex do servidor — dar feedback rápido no client sem roundtrip.
const EMAIL_REGEX = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9][a-z0-9._-]*@alloha\.com$/i;

/** "willian.souza@alloha.com" → "Willian Souza" */
function emailParaNome(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

interface Props {
  operadoresIniciais: OperadorD1[];
}

export function OperadoresD1Form({ operadoresIniciais }: Props) {
  const [operadores, setOperadores] = useState<OperadorD1[]>(operadoresIniciais);
  const [emailInput, setEmailInput] = useState("");
  const [erroInput, setErroInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Qualquer operação em andamento trava os botões.
  const ocupado = isAdding || deletingEmail !== null;

  function validarEmail(email: string): string {
    if (!email) return "Digite o email do operador.";
    if (!EMAIL_REGEX.test(email)) return "Use o formato nome.sobrenome@alloha.com";
    return "";
  }

  async function handleAdicionar() {
    const emailNorm = emailInput.trim().toLowerCase();
    const erro = validarEmail(emailNorm);
    if (erro) {
      setErroInput(erro);
      return;
    }
    setErroInput("");
    setIsAdding(true);
    try {
      const result = await adicionarOperadorAction(emailNorm);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOperadores((prev) => [...prev, { email: emailNorm }]);
      setEmailInput("");
      toast.success(`${emailParaNome(emailNorm)} adicionado à equipe.`);
    } catch {
      toast.error("Erro inesperado ao adicionar. Tente novamente.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleExcluir(email: string) {
    const nome = emailParaNome(email);
    if (
      !window.confirm(`Remover ${nome} da equipe do D-1?`)
    ) {
      return;
    }
    setDeletingEmail(email);
    try {
      const result = await excluirOperadorAction(email);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOperadores((prev) => prev.filter((op) => op.email !== email));
      toast.success(`${nome} removido da equipe.`);
    } catch {
      toast.error("Erro inesperado ao excluir. Tente novamente.");
    } finally {
      setDeletingEmail(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Lista de operadores ───────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Equipe atual
        </p>

        {operadores.length === 0 ? (
          <p className="ds-small text-muted-foreground">
            Nenhum operador na sua equipe ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {operadores.map((op) => (
              <li
                key={op.email}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium leading-tight">
                    {emailParaNome(op.email)}
                  </p>
                  <p className="ds-mono truncate text-xs text-muted-foreground">
                    {op.email}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={ocupado}
                  onClick={() => handleExcluir(op.email)}
                  className="ml-3 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title={`Excluir ${emailParaNome(op.email)}`}
                >
                  {deletingEmail === op.email ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconTrash />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Adicionar operador ────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Adicionar operador
        </p>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Input
              type="text"
              placeholder="nome.sobrenome@alloha.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (erroInput) setErroInput("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !ocupado) void handleAdicionar();
              }}
              disabled={ocupado}
              aria-invalid={!!erroInput || undefined}
              autoComplete="off"
              autoCapitalize="none"
            />
            {erroInput && (
              <p className="ds-small text-destructive">{erroInput}</p>
            )}
          </div>

          <Button onClick={() => void handleAdicionar()} disabled={ocupado}>
            {isAdding ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              "Adicionar"
            )}
          </Button>
        </div>

        <p className="ds-small text-muted-foreground">
          Após adicionar, os dados do novo operador podem levar alguns instantes
          para aparecer nas tabelas do D-1.
        </p>
      </section>
    </div>
  );
}
