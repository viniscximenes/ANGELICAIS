"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { IconArrowLeft, IconArrowUp, IconLoader2 } from "@tabler/icons-react";

import GradientWaves from "./GradientWaves";
import { ChatMessage, type ChatMessageData } from "./chat-message";

const Orb = dynamic(() => import("@/components/Orb"), { ssr: false });

// Um pouco acima do pior caso do servidor (20s conexão + 30s idle no stream),
// pra dar tempo do próprio backend desistir e mandar uma mensagem de erro
// antes do cliente abortar por conta própria.
const CHAT_TIMEOUT_MS = 60_000;

const SUGESTOES = [
  "Me envie todas as máscaras do Financeiro.",
  "Como funciona o cálculo da fidelidade contratual?",
  "Me mande o Book mais atualizado da retenção.",
  "Os dados que você me passar são confiáveis?",
];

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function handleSend(content?: string) {
    const text = (content ?? input).trim();
    if (!text || isStreaming) return;

    const historico: ChatMessageData[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages([...historico, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historico }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Falha na resposta (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error("[chat] erro:", err);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: isTimeout
            ? "Tempo esgotado aguardando resposta. Tente novamente."
            : "Desculpe, não consegui processar sua pergunta agora. Tente novamente em instantes.",
        };
        return updated;
      });
    } finally {
      clearTimeout(timeout);
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const lastMessage = messages[messages.length - 1];
  const isAwaitingFirstToken =
    isStreaming && lastMessage?.role === "assistant" && !lastMessage.content;
  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex h-[calc(100vh-60px)] flex-col bg-background">

      {/* ── Fundo animado GradientWaves ────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <GradientWaves
          horizonColor="#0B2044"
          waveColor="#1a3a6e"
          crestColor="#2EAD4F"
          speed={0.3}
          amplitude={2.0}
          waveScale={0.5}
          waveRatio={0.9}
          swell={30}
          turbulence={18}
          tilt={1.15}
          zoom={1.0}
          height={5.5}
          fogDepth={12}
          detail="medium"
          brightness={1.15}
          opacity={0.9}
          mouseInteraction
          parallaxStrength={0.3}
          grain
          grainIntensity={0.04}
        />
      </div>

      {/* Overlay escuro para legibilidade do conteúdo */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "color-mix(in oklch, var(--background) 30%, transparent)",
          pointerEvents: "none",
        }}
      />

      {/* ── Botão voltar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3">
        <Link
          href="/reports/consolidado"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={15} aria-hidden="true" />
          <span className="ds-small font-medium">Voltar</span>
        </Link>
      </div>

      {/* ── Área de mensagens ────────────────────────────────── */}
      <div className="relative z-[2] flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">

          {/* Estado vazio */}
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center gap-6 pt-[10vh] text-center">
              {/* Avatar IA animado */}
              <div className="w-24 h-24 mx-auto">
                <Orb
                  hoverIntensity={2}
                  rotateOnHover
                  hue={0}
                  forceHoverState={false}
                  backgroundColor="#0B2044"
                />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  IA Beedoo
                </h1>
                <p className="ds-body text-muted-foreground max-w-sm">
                  Assistente inteligente para procedimentos de atendimento e retenção
                </p>
              </div>

              {/* Chips de sugestão */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="ds-small rounded-full border border-border bg-card px-4 py-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border/80 transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens */}
          {hasMessages && (
            <div className="space-y-1 pb-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  message={message}
                  isTyping={
                    isAwaitingFirstToken && index === messages.length - 1
                  }
                />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Barra de input fixa na base ──────────────────────── */}
      <div className="relative z-[2] sticky bottom-0 bg-gradient-to-t from-background via-background/95 to-transparent pb-4 pt-3">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg transition-shadow focus-within:shadow-lg"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              outline: "none",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Mensagem para IA do Beedoo"
              rows={1}
              className="chat-input-no-focus ds-body flex-1 resize-none bg-transparent leading-normal outline-none focus:outline-none focus:ring-0 focus:border-transparent placeholder:text-muted-foreground/40 disabled:opacity-50"
              style={{ maxHeight: 200, boxShadow: "none", padding: 0, margin: 0, border: "none" }}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isStreaming || !input.trim()}
              aria-label="Enviar mensagem"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30 cursor-pointer"
              style={{
                background: input.trim() && !isStreaming
                  ? "var(--primary)"
                  : "var(--muted)",
              }}
            >
              {isStreaming ? (
                <IconLoader2
                  size={15}
                  className="animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <IconArrowUp
                  size={15}
                  className={input.trim() ? "text-primary-foreground" : "text-muted-foreground"}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            IA Beedoo pode cometer erros. Verifique informações importantes no próprio site oficial{" "}
            <a
              href="https://conecteallohafibra.beedoo.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:text-muted-foreground transition-colors"
            >
              Beedoo
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
