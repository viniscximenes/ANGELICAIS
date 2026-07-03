import { limparBases } from "@/lib/google/bases/limpar-bases";

// Nunca cachear/otimizar estaticamente — precisa rodar de verdade a cada
// chamada do cron (ver vercel.json, schedule "0 3 * * *" = 00:00 BRT).
export const dynamic = "force-dynamic";

/**
 * Chamada pelo Vercel Cron (GET). Protegida pelo header Authorization que a
 * Vercel envia automaticamente em produção: "Bearer <CRON_SECRET>". Exige a
 * env var CRON_SECRET configurada no projeto na Vercel.
 */
export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }

  const result = await limparBases();

  if (result.success) {
    console.log("[cron/limpar-bases] BASE - 1 e BASE - 2 limpas com sucesso");
    return Response.json({ success: true });
  }

  console.error("[cron/limpar-bases] falha ao limpar bases:", result.error);
  return Response.json({ success: false, error: result.error }, { status: 500 });
}
