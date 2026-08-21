import { createClient } from "@/lib/supabase/server";
import { buscarArtigosRelevantes } from "@/lib/kb/relevancia";
import type { KbArtigo } from "@/lib/kb/types";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-v4-flash-0731";

const PROMPT_SISTEMA_PADRAO =
  "Você é o assistente de procedimentos internos da Alloha Fibra, operação de retenção. Responda SOMENTE com base nos procedimentos abaixo. Se a pergunta não for coberta pelos procedimentos, diga que não tem informação sobre isso e sugira consultar o supervisor. Seja direto, objetivo e use linguagem simples. Responda em português.";

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function montarSystemMessage(
  promptSistema: string,
  artigosComLink: KbArtigo[],
  instrucoes: KbArtigo[],
): string {
  const contextoArtigos = artigosComLink
    .map((a) => {
      const linhas = [`## ${a.titulo}`];
      if (a.dataPublicacao) {
        linhas.push(`Publicado em: ${formatDateBR(a.dataPublicacao)}`);
      }
      if (a.link) linhas.push(`Link: ${a.link}`);
      linhas.push(a.conteudo);
      return linhas.join("\n");
    })
    .join("\n\n---\n\n");

  const contextoInstrucoes = instrucoes
    .map((a) => `## ${a.titulo}\n${a.conteudo}`)
    .join("\n\n---\n\n");

  return `${promptSistema}

REGRAS DE RESPOSTA:
- Quando usar informação de um ARTIGO, SEMPRE mencione a data de publicação e forneça o link no final da resposta, no formato: "Fonte: [Título do artigo](link) — Publicado em DD/MM/AAAA"
- Se usar múltiplos artigos, liste todas as fontes no final
- Artigos sem link não precisam de citação de fonte
- As INSTRUÇÕES abaixo são orientações internas sobre como responder — NÃO cite como fonte

INSTRUÇÕES INTERNAS:
${contextoInstrucoes || "(nenhuma)"}

ARTIGOS DE REFERÊNCIA:
${contextoArtigos || "(nenhum)"}`;
}

function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is ChatMessage =>
      !!m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );
}

// Timeout apenas para estabelecer a conexão/receber os headers da OpenRouter.
// Não cobre a leitura do corpo — isso é tratado à parte (idle timeout por
// chunk), porque um único deadline compartilhado entre "conectar" e "ler o
// stream inteiro" estava abortando a leitura no meio (ver bug corrigido
// abaixo: reader.read() sem try/catch deixava a resposta pendurada pro
// cliente quando isso acontecia).
const CONNECT_TIMEOUT_MS = 20_000;
// Tempo máximo sem receber nenhum chunk novo durante a leitura do stream.
const IDLE_READ_TIMEOUT_MS = 30_000;

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("[api/chat] OPENROUTER_API_KEY não configurada");
    return new Response("Assistente não configurado", { status: 500 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = parseMessages(body?.messages);
  } catch {
    return new Response("Requisição inválida", { status: 400 });
  }

  console.log("[chat] recebido:", messages.length, "mensagens");

  if (messages.length === 0) {
    return new Response("Nenhuma mensagem enviada", { status: 400 });
  }

  const ultimaPergunta =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const supabase = await createClient();

  const [{ data: configData, error: configError }, { data, error }] =
    await Promise.all([
      supabase.from("kb_config").select("prompt_sistema").single(),
      supabase
        .from("kb_artigos")
        .select("titulo, conteudo, tags, tipo, link, data_publicacao")
        .eq("ativo", true),
    ]);

  if (configError) {
    console.error("[api/chat] erro ao buscar config:", configError);
  }
  const promptSistema = configData?.prompt_sistema ?? PROMPT_SISTEMA_PADRAO;

  if (error) {
    console.error("[api/chat] erro ao buscar artigos:", error);
  }

  const artigos: KbArtigo[] = (data ?? []).map((a) => ({
    id: "",
    titulo: a.titulo,
    conteudo: a.conteudo,
    tags: a.tags ?? [],
    ativo: true,
    tipo: a.tipo,
    link: a.link,
    dataPublicacao: a.data_publicacao,
    createdAt: "",
    updatedAt: "",
  }));

  console.log("[chat] artigos encontrados:", artigos.length);

  // Instruções são orientações internas globais — sempre entram no contexto,
  // sem passar pelo filtro de relevância. Só artigos (que têm fonte citável)
  // são filtrados por palavra-chave.
  const artigosComLink = artigos.filter((a) => a.tipo === "artigo");
  const instrucoes = artigos.filter((a) => a.tipo === "instrucao");

  const relevantes = buscarArtigosRelevantes(ultimaPergunta, artigosComLink);
  const systemMessage = montarSystemMessage(
    promptSistema,
    relevantes,
    instrucoes,
  );

  console.log("[chat] chamando OpenRouter...");

  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.3,
        stream: true,
        // deepseek-v4-flash-0731 é um modelo híbrido de raciocínio — sem isso,
        // o provider gasta o max_tokens inteiro em "thinking" e o campo
        // `content` nunca chega a ser preenchido (resposta trava/nunca chega).
        reasoning: { enabled: false },
      }),
      signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[api/chat] falha ao conectar à OpenRouter:", err);
    return new Response(
      "Não foi possível contatar o assistente. Tente novamente.",
      { status: 504 },
    );
  }

  console.log("[chat] OpenRouter respondeu:", upstream.status);

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    console.error("[api/chat] erro OpenRouter:", upstream.status, errText);
    return new Response("Erro ao consultar o assistente", { status: 502 });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  // Lê com um timeout de inatividade: se nenhum chunk novo chegar dentro do
  // prazo, decide que o stream travou e desiste — em vez de ficar esperando
  // pra sempre (era exatamente isso que travava a resposta no cliente).
  function readWithIdleTimeout() {
    return new Promise<ReadableStreamReadResult<Uint8Array>>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Tempo esgotado aguardando a OpenRouter"));
        }, IDLE_READ_TIMEOUT_MS);

        reader
          .read()
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      // BUG DE AMBIENTE (Next.js dev + Windows, verificado por reprodução
      // isolada): se duas chamadas de pull() seguidas terminam sem chamar
      // controller.enqueue(), o Next para de chamar pull() de novo e a
      // resposta HTTP fica pendurada pra sempre — sem fechar, sem erro,
      // sem dado nenhum chegando ao cliente. Isso acontecia sempre: os
      // chunks finais da OpenRouter (delta vazio com finish_reason:"stop",
      // o chunk de "usage" e o [DONE]) chegam em pulls separados sem
      // conteúdo de texto, então pull() retornava vazio duas vezes seguidas
      // e travava exatamente antes do [DONE] ser processado.
      //
      // Correção: pull() nunca retorna de mãos vazias — ele relê
      // internamente até enfileirar algo, fechar (done/[DONE]) ou dar erro.
      while (true) {
        let done: boolean;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await readWithIdleTimeout());
        } catch (err) {
          console.error("[chat] erro/timeout lendo stream da OpenRouter:", err);
          controller.error(err);
          reader.cancel().catch(() => {});
          return;
        }

        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Última linha pode estar incompleta — guarda pro próximo pull.
        buffer = lines.pop() ?? "";

        let enqueued = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();

          // [DONE] é o sinal definitivo de fim de stream — a OpenRouter nem
          // sempre encerra a conexão TCP logo em seguida, então esperar o
          // `reader.read()` retornar `done` deixava a resposta pendurada
          // (~30s) mesmo com o texto inteiro já recebido.
          if (payload === "[DONE]") {
            controller.close();
            reader.cancel().catch(() => {});
            return;
          }

          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              controller.enqueue(encoder.encode(delta));
              enqueued = true;
            }
          } catch {
            // linha SSE malformada/parcial — ignora
          }
        }

        if (enqueued) return;
        // Chunk sem conteúdo útil (comentário de keep-alive, delta vazio) —
        // continua o loop e lê o próximo em vez de retornar vazio.
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
