"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconUser,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/stagger-container";
import { loginAction } from "@/lib/auth/login-action";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 60;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function LoginForm() {
  const usernameRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockSeconds((s) => {
        if (s <= 1) {
          setAttempts(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockSeconds]);

  // O login não valida formato — quem decide se as credenciais existem é o
  // Supabase Auth. Isso permite usuários especiais (ex.: "relatorio", sem
  // ponto / senha curta) sem afetar os demais. Aqui só evitamos enviar vazio.
  function validateUsername(value: string) {
    if (!value.trim()) {
      setUsernameError("Informe seu usuário");
      return false;
    }
    setUsernameError(null);
    return true;
  }

  function validatePassword(value: string) {
    if (value.length === 0) {
      setPasswordError("Informe sua senha");
      return false;
    }
    setPasswordError(null);
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || lockSeconds > 0) return;

    const validU = validateUsername(username);
    const validP = validatePassword(password);
    if (!validU || !validP) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginAction(username, password);

      // Se chegou aqui, é porque NÃO houve redirect (ou seja, deu erro)
      if (result && !result.success) {
        setLoading(false);
        const next = attempts + 1;
        setAttempts(next);
        setErrorMessage(
          result.error === "conexao"
            ? "Não foi possível conectar. Tente novamente."
            : result.error === "inativo"
              ? "Conta desativada. Contate o administrador."
              : "Usuário ou senha incorretos.",
        );
        if (next >= MAX_ATTEMPTS) {
          setLockSeconds(LOCK_DURATION);
        }
        usernameRef.current?.focus();
      }
      // Em caso de sucesso, a página redireciona e o componente
      // desmonta — não precisa setar loading=false
    } catch (err) {
      // NEXT_REDIRECT é o tipo especial de erro do Next quando
      // redirect() é chamado. Não devemos tratar como erro real.
      if (err instanceof Error && err.message === "NEXT_REDIRECT") {
        throw err;
      }

      setLoading(false);
      setErrorMessage("Não foi possível conectar. Tente novamente.");
      console.error("[form] exception:", err);
    }
  }

  const isDisabled = loading || lockSeconds > 0;

  return (
    <div className="flex h-full items-center justify-center px-6 py-12 lg:justify-start lg:px-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="w-full" noValidate>
          <StaggerContainer
            staggerDelay={0.04}
            initialDelay={0.05}
            className="flex flex-col"
          >
            <StaggerItem>
              <h1 className="ds-h1">Bem-vindo de volta</h1>
            </StaggerItem>

            <StaggerItem>
              <p className="ds-body text-muted-foreground mt-2">
                Acesse seu painel operacional
              </p>
            </StaggerItem>

            <StaggerItem className="mt-8">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="username"
                  className="ds-small text-muted-foreground"
                >
                  Usuário
                </Label>
                <div className="relative">
                  <IconUser
                    size={16}
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  />
                  <Input
                    id="username"
                    ref={usernameRef}
                    name="username"
                    autoFocus
                    autoComplete="username"
                    spellCheck={false}
                    placeholder="nome.sobrenome"
                    className="h-10 pl-10 bg-black/10 border-white/5 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase());
                      if (usernameError) setUsernameError(null);
                    }}
                    onBlur={(e) => {
                      if (e.target.value) validateUsername(e.target.value);
                    }}
                    disabled={isDisabled}
                    aria-invalid={!!usernameError}
                    aria-describedby={usernameError ? "username-error" : undefined}
                  />
                </div>
                {usernameError && (
                  <p
                    id="username-error"
                    role="alert"
                    className="ds-text-danger ds-small"
                  >
                    {usernameError}
                  </p>
                )}
              </div>
            </StaggerItem>

            <StaggerItem className="mt-4">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="password"
                  className="ds-small text-muted-foreground"
                >
                  Senha
                </Label>
                <div className="relative">
                  <IconLock
                    size={16}
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-10 pr-10 pl-10 bg-black/10 border-white/5 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    onBlur={(e) => {
                      if (e.target.value || passwordError)
                        validatePassword(e.target.value);
                    }}
                    disabled={isDisabled}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Esconder senha" : "Mostrar senha"
                    }
                    disabled={isDisabled}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-3 -translate-y-1/2 rounded-sm transition-colors outline-none focus-visible:ring-3 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <IconEyeOff size={16} aria-hidden="true" />
                    ) : (
                      <IconEye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p
                    id="password-error"
                    role="alert"
                    className="ds-text-danger ds-small"
                  >
                    {passwordError}
                  </p>
                )}
              </div>
            </StaggerItem>

            <AnimatePresence initial={false}>
              {errorMessage && (
                <motion.div
                  key="error-alert"
                  role="alert"
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                  className="status-danger ds-small mt-6 flex items-center gap-2 overflow-hidden rounded-md p-3"
                >
                  <IconAlertCircle
                    size={16}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <StaggerItem className="mt-6">
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/10 active:scale-[0.99] transition-all duration-200"
                disabled={isDisabled}
              >
                {loading ? (
                  <IconLoader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : lockSeconds > 0 ? (
                  `Aguarde ${lockSeconds}s...`
                ) : (
                  "Entrar"
                )}
              </Button>
            </StaggerItem>

            <StaggerItem className="mt-4">
              <p className="ds-small text-muted-foreground text-center">
                Esqueceu sua senha? Fale com o administrador.
              </p>
            </StaggerItem>
          </StaggerContainer>
        </form>
      </div>

      <AnimatePresence>
        {lockSeconds > 0 && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            className="status-danger ds-small fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-md p-3 shadow-lg"
          >
            <IconAlertCircle
              size={16}
              aria-hidden="true"
              className="shrink-0"
            />
            <span>Muitas tentativas. Aguarde antes de tentar novamente.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
