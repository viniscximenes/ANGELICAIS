"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { BeedooIcon } from "./beedoo-icon";
import { TypingIndicator } from "./typing-indicator";

export type ChatMessageData = { role: "user" | "assistant"; content: string };

// react-markdown injeta um prop `node` (AST) em cada componente customizado —
// precisa ser removido antes de espalhar o resto nos elementos DOM.
function omitNode<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

/** Extrai texto puro de children React (suporta strings e elementos aninhados) */
function extrairTexto(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extrairTexto).join("");
  if (children && typeof children === "object" && "props" in (children as object)) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>;
    return extrairTexto(el.props.children);
  }
  return "";
}

/** Bloco de código com botão de copiar */
function CopyableCodeBlock({ children, ...rest }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const texto = extrairTexto(children);
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative mb-4 last:mb-0 group">
      <pre
        className="ds-mono-sm overflow-x-auto rounded-xl p-4 pr-14 text-[12px]"
        style={{
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
        {...rest}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar código"
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
        style={{
          background: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        {copied ? (
          <>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copiado
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Copiar
          </>
        )}
      </button>
    </div>
  );
}

interface Props {
  message: ChatMessageData;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end py-1">
        <div
          className="ds-body max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed sm:max-w-[70%]"
          style={{
            background: "var(--elevation-2-bg, var(--muted))",
            border: "1px solid var(--border)",
          }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Mensagem do assistente — avatar à esquerda, texto limpo
  return (
    <div className="flex items-start gap-3 py-2">
      {/* Ícone IA — mt compensa o line-height do text-sm leading-relaxed */}
      <div className="mt-[3px] shrink-0">
        <BeedooIcon size={22} />
      </div>

      {/* Conteúdo */}
      <div className="ds-body min-w-0 flex-1 text-sm leading-relaxed text-foreground">
        {isTyping ? (
          <TypingIndicator />
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                p: (props) => (
                  <p className="mb-3 last:mb-0" {...omitNode(props)} />
                ),
                strong: (props) => (
                  <strong className="font-semibold" {...omitNode(props)} />
                ),
                ul: (props) => (
                  <ul
                    className="mb-3 list-disc space-y-2 pl-5 last:mb-0"
                    {...omitNode(props)}
                  />
                ),
                ol: (props) => (
                  <ol
                    className="mb-3 list-decimal space-y-4 pl-5 last:mb-0"
                    {...omitNode(props)}
                  />
                ),
                li: (props) => (
                  <li className="leading-relaxed" {...omitNode(props)} />
                ),
                h1: (props) => (
                  <h1
                    className="mb-2 text-base font-bold"
                    {...omitNode(props)}
                  />
                ),
                h2: (props) => (
                  <h2
                    className="mb-2 text-sm font-semibold"
                    {...omitNode(props)}
                  />
                ),
                h3: (props) => (
                  <h3
                    className="mb-1.5 text-sm font-semibold"
                    {...omitNode(props)}
                  />
                ),
                code: (props) => (
                  <code
                    className="ds-mono-sm rounded-md px-1.5 py-0.5 text-[12px]"
                    style={{ background: "var(--muted)" }}
                    {...omitNode(props)}
                  />
                ),
                pre: ({ children, ...props }) => (
                  <CopyableCodeBlock {...omitNode(props)}>
                    {children}
                  </CopyableCodeBlock>
                ),
                a: (props) => (
                  <a
                    className="text-gray-300/80 underline underline-offset-2 hover:text-white/90 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...omitNode(props)}
                  />
                ),
                hr: () => (
                  <hr className="my-3 border-border" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
