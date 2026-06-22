import fs from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { formatDataFeedback } from "@/lib/feedback/compute-semana";

type RequestBody = {
  tema: string;
  descricao: string;
  data_aplicacao: string;
  quantidade: number;
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

  const { tema, descricao, data_aplicacao, quantidade } = body;

  if (!tema?.trim() || !descricao?.trim()) {
    return new Response("Tema e descrição são obrigatórios", { status: 400 });
  }
  if (!data_aplicacao) {
    return new Response("Data de aplicação obrigatória", { status: 400 });
  }
  const N = Math.max(1, Math.floor(Number(quantidade) || 1));

  // Descrição → array de parágrafos (espaço real entre estrofes no template)
  const paragrafos = descricao
    .split("\n")
    .filter((s) => s.trim())
    .map((texto) => ({ texto }));

  // Assinaturas em 1 coluna
  const linhas: { item: string }[] = [];
  for (let i = 1; i <= N; i++) {
    linhas.push({ item: `${i}. _________________________________________________` });
  }

  const dataFormatada = formatDataFeedback(data_aplicacao);

  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "ata_template.docx",
  );

  let content: Buffer;
  try {
    content = fs.readFileSync(templatePath);
  } catch {
    console.error("[feedback/atas] template não encontrado:", templatePath);
    return new Response("Template não encontrado", { status: 500 });
  }

  let buf: Buffer;
  try {
    const zip = new PizZip(content);

    // Template has loop tags as raw text nodes outside <w:p> elements.
    // Docxtemplater only processes tags inside <w:p>, so we wrap them first.
    let docXml = zip.file("word/document.xml")!.asText();
    docXml = docXml
      .replace(/>\s*\{#paragrafos\}\s*</g, "><w:p><w:r><w:t>{#paragrafos}</w:t></w:r></w:p><")
      .replace(/>\s*\{\/paragrafos\}\s*</g, "><w:p><w:r><w:t>{/paragrafos}</w:t></w:r></w:p><")
      .replace(/>\s*\{#linhas\}\s*</g, "><w:p><w:r><w:t>{#linhas}</w:t></w:r></w:p><")
      .replace(/>\s*\{\/linhas\}\s*</g, "><w:p><w:r><w:t>{/linhas}</w:t></w:r></w:p><");
    zip.file("word/document.xml", docXml);

    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render({ tema: tema.trim(), supervisor, data_aplicacao: dataFormatada, paragrafos, linhas });
    buf = Buffer.from(doc.getZip().generate({ type: "nodebuffer" }) as Buffer);
  } catch (err) {
    console.error("[feedback/atas] erro docxtemplater:", err);
    return new Response("Erro na geração do documento", { status: 500 });
  }

  const temaSlug = tema.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const dataSlug = data_aplicacao.replace(/-/g, "");
  const nomeArquivo = `Ata_${temaSlug}_${dataSlug}.docx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
    },
  });
}
