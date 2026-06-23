"use client";

import { useCallback, useState, useTransition } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  saveNomeFantasiaAction,
  type OperadorNomeEntry,
} from "@/lib/gestor/nome-fantasia/save-config";

type EntradaOperador = {
  email: string;
  nomeReal: string;
  nomeFantasia: string;
};

interface NomeFantasiaFormProps {
  ativoInicial: boolean;
  operadores: { email: string; nomeReal: string }[];
  mapaInicial: Record<string, string>;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: checked ? "var(--primary)" : "color-mix(in oklch, var(--muted-foreground) 40%, transparent)",
      }}
    >
      <span
        className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export function NomeFantasiaForm({
  ativoInicial,
  operadores,
  mapaInicial,
}: NomeFantasiaFormProps) {
  const [ativo, setAtivo] = useState(ativoInicial);
  const [entradas, setEntradas] = useState<EntradaOperador[]>(() =>
    operadores.map((op) => ({
      email: op.email,
      nomeReal: op.nomeReal,
      nomeFantasia: mapaInicial[op.email] ?? "",
    })),
  );
  const [camposFaltando, setCamposFaltando] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleFantasiaChange = useCallback(
    (email: string, valor: string) => {
      setEntradas((prev) =>
        prev.map((en) =>
          en.email === email ? { ...en, nomeFantasia: valor } : en,
        ),
      );
      if (camposFaltando.has(email)) {
        setCamposFaltando((prev) => {
          const next = new Set(prev);
          next.delete(email);
          return next;
        });
      }
    },
    [camposFaltando],
  );

  const handleSave = () => {
    if (ativo) {
      const faltando = entradas
        .filter((e) => !e.nomeFantasia.trim())
        .map((e) => e.email);

      if (faltando.length > 0) {
        setCamposFaltando(new Set(faltando));
        toast.error("Preencha o nome fantasia de todos os operadores");
        return;
      }
    }

    setCamposFaltando(new Set());

    const lista: OperadorNomeEntry[] = entradas.map((e) => ({
      email: e.email,
      nomeFantasia: e.nomeFantasia,
    }));

    startTransition(async () => {
      const result = await saveNomeFantasiaAction(ativo, lista);
      if (result.success) {
        toast.success("Configurações salvas");
      } else {
        toast.error(result.error);
        if (result.camposFaltando) {
          setCamposFaltando(new Set(result.camposFaltando));
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Switch global */}
      <div
        className="elevation-1 flex items-center gap-4 rounded-xl p-5"
        style={{ border: "1px solid var(--border)" }}
      >
        <ToggleSwitch
          checked={ativo}
          onChange={setAtivo}
          disabled={isPending}
        />
        <div>
          <p className="ds-body font-medium">
            {ativo ? "Nome fantasia ativado" : "Nome fantasia desativado"}
          </p>
          <p className="ds-small text-muted-foreground">
            {ativo
              ? "As tabelas do painel usarão os apelidos definidos abaixo."
              : "As tabelas usarão os nomes reais dos operadores."}
          </p>
        </div>
      </div>

      {/* Lista de operadores (visível só quando ligado) */}
      {ativo && (
        <div className="space-y-4">
          {operadores.length === 0 ? (
            <p className="ds-small text-muted-foreground">
              Nenhum operador encontrado na planilha D-1.
            </p>
          ) : (
            <>
              <p className="ds-mono-sm text-muted-foreground uppercase tracking-widest">
                Operadores
              </p>
              <div className="space-y-2">
                {entradas.map((entrada) => {
                  const isFaltando = camposFaltando.has(entrada.email);
                  return (
                    <div
                      key={entrada.email}
                      className="elevation-1 flex items-center gap-4 rounded-lg px-4 py-3"
                      style={{
                        border: `1px solid ${isFaltando ? "var(--danger)" : "var(--border)"}`,
                        background: isFaltando
                          ? "color-mix(in oklch, var(--danger) 5%, transparent)"
                          : undefined,
                      }}
                    >
                      <span
                        className="ds-small text-muted-foreground shrink-0 font-mono"
                        style={{ minWidth: "160px" }}
                      >
                        {entrada.email.split("@")[0]}
                      </span>
                      <span
                        className="text-muted-foreground/40 shrink-0 select-none"
                        aria-hidden
                      >
                        →
                      </span>
                      <input
                        type="text"
                        value={entrada.nomeFantasia}
                        onChange={(e) =>
                          handleFantasiaChange(entrada.email, e.target.value)
                        }
                        disabled={isPending}
                        placeholder="Nome fantasia..."
                        aria-label={`Nome fantasia de ${entrada.email.split("@")[0]}`}
                        aria-invalid={isFaltando}
                        className="elevation-2 ds-small flex-1 rounded-md px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-primary transition-shadow"
                        style={{ border: "1px solid var(--border)" }}
                      />
                    </div>
                  );
                })}
              </div>

              {camposFaltando.size > 0 && (
                <p
                  className="ds-small"
                  style={{ color: "var(--danger)" }}
                >
                  Preencha o nome fantasia de todos os operadores antes de salvar.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Botão salvar */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending && (
            <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
