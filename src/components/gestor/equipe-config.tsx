"use client";

import { useCallback, useRef, useState } from "react";
import { IconLoader2, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { StyledCard } from "@/components/gestor/styled-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adicionarOperadorAction,
  removerOperadorAction,
  salvarApelidoAction,
  toggleApelidosAction,
  type OperadorEquipe,
} from "@/lib/gestor/equipe/actions";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9][a-z0-9._-]*@alloha\.com$/i;
const DEBOUNCE_MS = 300;

/** "willian.souza@alloha.com" → "willian.souza" (prefixo cru, sem capitalizar). */
function prefixoEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

interface Props {
  ativoInicial: boolean;
  operadoresIniciais: OperadorEquipe[];
}

export function EquipeConfig({ ativoInicial, operadoresIniciais }: Props) {
  const [ativo, setAtivo] = useState(ativoInicial);
  const [operadores, setOperadores] = useState<OperadorEquipe[]>(operadoresIniciais);
  const [emailInput, setEmailInput] = useState("");
  const [erroInput, setErroInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  // Último valor persistido por email — evita salvar (e avisar) quando o
  // gestor entra e sai do campo sem mudar nada.
  const salvosRef = useRef<Map<string, string>>(
    new Map(operadoresIniciais.map((op) => [op.email, op.apelido])),
  );
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Toggle global ────────────────────────────────────────────────
  const handleToggle = useCallback(async (valor: boolean) => {
    const anterior = !valor;
    setAtivo(valor);
    const r = await toggleApelidosAction(valor);
    if (!r.ok) {
      setAtivo(anterior);
      toast.error(r.error);
    }
  }, []);

  // ── Apelido: debounce no blur ────────────────────────────────────
  function handleApelidoChange(email: string, valor: string) {
    setOperadores((prev) =>
      prev.map((op) => (op.email === email ? { ...op, apelido: valor } : op)),
    );
  }

  function handleApelidoBlur(email: string, valor: string) {
    const normalizado = valor.trim();
    if (salvosRef.current.get(email) === normalizado) return; // nada mudou

    const timerAnterior = timersRef.current.get(email);
    if (timerAnterior) clearTimeout(timerAnterior);

    const timer = setTimeout(async () => {
      timersRef.current.delete(email);
      const r = await salvarApelidoAction(email, normalizado);
      if (r.ok) {
        salvosRef.current.set(email, normalizado);
        toast.success("Apelido salvo");
      } else {
        toast.error(r.error);
      }
    }, DEBOUNCE_MS);

    timersRef.current.set(email, timer);
  }

  // ── Adicionar ────────────────────────────────────────────────────
  async function handleAdicionar() {
    const emailNorm = emailInput.trim().toLowerCase();
    if (!emailNorm) {
      setErroInput("Digite o email do operador.");
      return;
    }
    if (!EMAIL_REGEX.test(emailNorm)) {
      setErroInput("Use o formato nome.sobrenome@alloha.com");
      return;
    }

    setErroInput("");
    setIsAdding(true);
    try {
      const r = await adicionarOperadorAction(emailNorm);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setOperadores((prev) =>
        [...prev, { email: emailNorm, apelido: "" }].sort((a, b) =>
          a.email.localeCompare(b.email),
        ),
      );
      salvosRef.current.set(emailNorm, "");
      setEmailInput("");
      toast.success("Operador adicionado");
    } finally {
      setIsAdding(false);
    }
  }

  // ── Remover (otimista, sem confirmação) ──────────────────────────
  async function handleRemover(email: string) {
    const snapshot = operadores;
    setRemovendo(email);
    setOperadores((prev) => prev.filter((op) => op.email !== email));

    const r = await removerOperadorAction(email);
    if (r.ok) {
      salvosRef.current.delete(email);
      const timer = timersRef.current.get(email);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(email);
      }
      toast.success("Operador removido");
    } else {
      setOperadores(snapshot); // desfaz o otimismo
      toast.error(r.error);
    }
    setRemovendo(null);
  }

  const ocupado = isAdding || removendo !== null;

  return (
    <StyledCard withGradient className="p-6 gap-0">
      {/* ── Toggle: linha discreta, sem card próprio ─────────────── */}
      <div className="border-border flex items-center justify-between gap-4 border-b border-dashed pb-4">
        <div className="min-w-0">
          <p className="ds-body font-medium">Usar nomes fantasias nas tabelas</p>
          <p className="ds-small text-muted-foreground">
            {ativo
              ? "As tabelas exibem os nomes fantasias definidos abaixo."
              : "As tabelas exibem os nomes reais. Você pode preparar os nomes fantasias mesmo desligado."}
          </p>
        </div>
        <Switch
          checked={ativo}
          onCheckedChange={(v) => void handleToggle(v)}
          aria-label="Usar nomes fantasias nas tabelas"
          className="shrink-0"
        />
      </div>

      {/* ── Tabela de operadores ─────────────────────────────────── */}
      <Table className="mt-4">
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
            <TableHead className="ds-mono-sm text-muted-foreground px-3 py-3.5 font-semibold tracking-wider uppercase align-middle leading-none">
              Operador
            </TableHead>
            <TableHead className="ds-mono-sm text-muted-foreground px-3 py-3.5 font-semibold tracking-wider uppercase align-middle leading-none">
              Nome Fantasia
            </TableHead>
            <TableHead className="w-10 px-3 py-3.5 text-right align-middle" aria-label="Ações" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {operadores.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={3} className="py-10 text-center">
                <p className="ds-small text-muted-foreground">
                  Nenhum operador na sua equipe ainda. Adicione o primeiro abaixo.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            operadores.map((op) => (
              <TableRow key={op.email} className="hover:bg-muted/10">
                <TableCell
                  className="ds-mono max-w-[220px] truncate px-3 py-2 align-middle"
                  title={op.email}
                >
                  {prefixoEmail(op.email)}
                </TableCell>

                <TableCell className="px-3 py-2 align-middle">
                  <Input
                    type="text"
                    value={op.apelido}
                    disabled={!ativo || ocupado}
                    placeholder="Sem nome fantasia"
                    aria-label={`Nome fantasia de ${prefixoEmail(op.email)}`}
                    onChange={(e) => handleApelidoChange(op.email, e.target.value)}
                    onBlur={(e) => handleApelidoBlur(op.email, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className={cn(
                      "border-border/60 min-w-[140px]",
                      !ativo && "text-muted-foreground",
                    )}
                    autoComplete="off"
                  />
                </TableCell>

                <TableCell className="px-3 py-1.5 text-right align-middle">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={ocupado}
                    onClick={() => void handleRemover(op.email)}
                    title={`Remover ${prefixoEmail(op.email)} da equipe`}
                    aria-label={`Remover ${prefixoEmail(op.email)} da equipe`}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    {removendo === op.email ? (
                      <IconLoader2 className="animate-spin" />
                    ) : (
                      <IconTrash />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* ── Adicionar operador ───────────────────────────────────── */}
      <div className="border-border mt-4 space-y-1 border-t border-dashed pt-4">
        <div className="flex gap-2">
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
            aria-label="Email do operador a adicionar"
            autoComplete="off"
            autoCapitalize="none"
            className="border-border/60 flex-1"
          />

          <Button
            onClick={() => void handleAdicionar()}
            disabled={ocupado}
            className="shrink-0 gap-1.5"
          >
            {isAdding ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconUserPlus size={15} aria-hidden="true" />
            )}
            Adicionar
          </Button>
        </div>

        {erroInput && <p className="ds-small text-destructive">{erroInput}</p>}
      </div>
    </StyledCard>
  );
}
