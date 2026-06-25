import fs from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { formatDataFeedback } from "@/lib/feedback/compute-semana";
import {
  computeTempoLogado,
  type DiaInputTL,
} from "@/lib/feedback/compute-tempo-logado";

const SLUGS_DIAS = ["seg", "ter", "qua", "qui", "sex", "sab"] as const;

type RequestBody = {
  operador: string;
  segundaFeira: string;
  dataFeedback: string;
  dias: DiaInputTL[];
};

export async function POST(req: Request): Promise<Response> {
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

  const semana = computeTempoLogado(dias ?? [], segundaFeira);
  const dataFeedbackFormatada = formatDataFeedback(dataFeedback);

  const templateData: Record<string, string> = {
    periodo: semana.periodo,
    operador: operador.trim(),
    supervisor,
    data_feedback: dataFeedbackFormatada,
    tlog_total: semana.consolidado.tlog,
    login_total: semana.consolidado.login,
    deslog_total: semana.consolidado.deslog,
  };

  for (let i = 0; i < 6; i++) {
    const slug = SLUGS_DIAS[i];
    templateData[`dia_${slug}`] = semana.diasFormatados[i] ?? "";
    templateData[`tlog_${slug}`] = semana.dias[i]?.tlog ?? "—";
    templateData[`login_${slug}`] = semana.dias[i]?.login ?? "—";
    templateData[`logout_${slug}`] = semana.dias[i]?.deslog ?? "—";
  }

  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "feedback_tempologado_template.docx",
  );

  let content: Buffer;
  try {
    content = fs.readFileSync(templatePath);
  } catch {
    console.error("[feedback/tempo-logado] template não encontrado:", templatePath);
    return new Response("Template não encontrado", { status: 500 });
  }

  let buf: Buffer;
  try {
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(templateData);
    buf = Buffer.from(doc.getZip().generate({ type: "nodebuffer" }) as Buffer);
  } catch (err) {
    console.error("[feedback/tempo-logado] erro docxtemplater:", err);
    return new Response("Erro na geração do documento", { status: 500 });
  }

  const nomeArquivo = `Feedback_TempoLogado_${operador.trim().replace(/\s+/g, "_")}_${semana.periodo.replace(/\//g, "-")}.docx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
    },
  });
}
