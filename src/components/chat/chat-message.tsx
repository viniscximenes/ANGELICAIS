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
      {/* Avatar IA animado */}
      <div className="mt-0.5 shrink-0">
        <BeedooIcon size={28} />
      </div>

      {/* Conteúdo */}
      <div className="ds-body min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-foreground">
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
                    className="mb-3 list-disc space-y-1 pl-5 last:mb-0"
                    {...omitNode(props)}
                  />
                ),
                ol: (props) => (
                  <ol
                    className="mb-3 list-decimal space-y-1 pl-5 last:mb-0"
                    {...omitNode(props)}
                  />
                ),
                li: (props) => <li {...omitNode(props)} />,
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
                pre: (props) => (
                  <pre
                    className="ds-mono-sm mb-3 overflow-x-auto rounded-xl p-4 text-[12px] last:mb-0"
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                    {...omitNode(props)}
                  />
                ),
                a: (props) => (
                  <a
                    className="text-primary underline underline-offset-2 hover:opacity-80"
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
