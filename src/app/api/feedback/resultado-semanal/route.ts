import fs from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  computeSemana,
  formatDataFeedback,
  type DiaInput,
} from "@/lib/feedback/compute-semana";

const SLUGS_DIAS = ["seg", "ter", "qua", "qui", "sex", "sab"] as const;

type RequestBody = {
  operador: string;
  segundaFeira: string;
  dataFeedback: string;
  dias: DiaInput[];
};

export async function POST(req: Request): Promise<Response> {
  // Gate: só GESTOR pode gerar
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "GESTOR") {
    return new Response("Não autorizado", { status: 401 });
  }

  const supervisor = user.profile.fullName;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response("Requisição inválida", { status: 400 });
  }

  const { operador, segundaFeira, dataFeedback, dias } = body;

  if (!operador?.trim() || !segundaFeira || !dataFeedback) {
    return new Response("Campos obrigatórios ausentes", { status: 400 });
  }

  const semana = computeSemana(dias ?? [], segundaFeira);
  const dataFeedbackFormatada = formatDataFeedback(dataFeedback);

  // Montar dados do template
  const templateData: Record<string, string> = {
    periodo: semana.periodo,
    operador: operador.trim(),
    supervisor,
    data_feedback: dataFeedbackFormatada,
    tx_total: semana.consolidado.tx,
    ret_total: semana.consolidado.ret,
    canc_total: semana.consolidado.canc,
    ped_total: semana.consolidado.ped,
  };

  for (let i = 0; i < 6; i++) {
    const slug = SLUGS_DIAS[i];
    templateData[`dia_${slug}`] = semana.diasFormatados[i] ?? "";
    templateData[`tx_${slug}`] = semana.dias[i]?.tx ?? "—";
    templateData[`ret_${slug}`] = semana.dias[i]?.ret ?? "—";
    templateData[`canc_${slug}`] = semana.dias[i]?.canc ?? "—";
    templateData[`ped_${slug}`] = semana.dias[i]?.ped ?? "—";
  }

  // Ler template — public/ é sempre incluído no deploy Vercel
  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "feedback_template.docx",
  );

  let content: Buffer;
  try {
    content = fs.readFileSync(templatePath);
  } catch {
    console.error("[feedback/resultado-semanal] template não encontrado:", templatePath);
    return new Response("Template não encontrado", { status: 500 });
  }

  // Gerar .docx
  let buf: Buffer;
  try {
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(templateData);
    buf = Buffer.from(doc.getZip().generate({ type: "nodebuffer" }) as Buffer);
  } catch (err) {
    console.error("[feedback/resultado-semanal] erro docxtemplater:", err);
    return new Response("Erro na geração do documento", { status: 500 });
  }

  const nomeArquivo = `Feedback_Semanal_${operador.trim().replace(/\s+/g, "_")}_${semana.periodo.replace(/\//g, "-")}.docx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
    },
  });
}
