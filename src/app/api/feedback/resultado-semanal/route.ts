import fs from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  computeSemana,
  type DiaInput,
} from "@/lib/feedback/compute-semana";
import {
  computeTempoLogado,
  type DiaInputTL,
} from "@/lib/feedback/compute-tempo-logado";
import {
  computeIndisponibilidade,
  type DiaInputIndisp,
} from "@/lib/feedback/compute-indisponibilidade";

const SLUGS_DIAS = ["seg", "ter", "qua", "qui", "sex", "sab"] as const;

// O template já tem o nome do dia estático ("SEGUNDA · {dia_seg}"), então aqui
// só precisamos da data — diasFormatados vem como "Segunda · DD/MM".
function apenasData(diaFormatado: string): string {
  const idx = diaFormatado.lastIndexOf(" · ");
  return idx === -1 ? diaFormatado : diaFormatado.slice(idx + 3);
}

// Formata "YYYY-MM-DD" como "DD/MM/AAAA", sem dia da semana.
function formatDataSimples(dateStr: string): string {
  if (!dateStr || dateStr.length !== 10) return dateStr;
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

type RequestBody = {
  operador: string;
  segundaFeira: string;
  dataFeedback: string;
  consolidado: DiaInput[];
  tempoLogado: DiaInputTL[];
  indisponibilidade: DiaInputIndisp[];
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

  const { operador, segundaFeira, dataFeedback, consolidado, tempoLogado, indisponibilidade } = body;

  if (!operador?.trim() || !segundaFeira || !dataFeedback) {
    return new Response("Campos obrigatórios ausentes", { status: 400 });
  }

  const semanaConsolidado = computeSemana(consolidado ?? [], segundaFeira);
  const semanaTL = computeTempoLogado(tempoLogado ?? [], segundaFeira);
  const semanaIndisp = computeIndisponibilidade(indisponibilidade ?? [], segundaFeira);
  const dataFeedbackFormatada = formatDataSimples(dataFeedback);

  // Montar dados do template
  const templateData: Record<string, string> = {
    periodo: semanaConsolidado.periodo,
    operador: operador.trim(),
    supervisor,
    data_feedback: dataFeedbackFormatada,

    tx_total: semanaConsolidado.consolidado.tx,
    ret_total: semanaConsolidado.consolidado.ret,
    canc_total: semanaConsolidado.consolidado.canc,
    ped_total: semanaConsolidado.consolidado.ped,

    tlog_total: semanaTL.consolidado.tlog,
    login_total: semanaTL.consolidado.login,
    logout_total: semanaTL.consolidado.deslog,

    indisp_total: semanaIndisp.consolidado.indisp,
    nr17_total: semanaIndisp.consolidado.nr17,
    part_total: semanaIndisp.consolidado.part,
    outras_total: semanaIndisp.consolidado.outras,
  };

  for (let i = 0; i < 6; i++) {
    const slug = SLUGS_DIAS[i];
    // {dia_seg}..{dia_sab} é o mesmo placeholder reaproveitado nas 3 tabelas do template.
    // O template já imprime o nome do dia em estático (ex: "SEGUNDA · {dia_seg}"),
    // então aqui só entra a data — nunca o nome do dia de novo.
    templateData[`dia_${slug}`] = apenasData(semanaConsolidado.diasFormatados[i] ?? "");

    templateData[`tx_${slug}`] = semanaConsolidado.dias[i]?.tx ?? "—";
    templateData[`ret_${slug}`] = semanaConsolidado.dias[i]?.ret ?? "—";
    templateData[`canc_${slug}`] = semanaConsolidado.dias[i]?.canc ?? "—";
    templateData[`ped_${slug}`] = semanaConsolidado.dias[i]?.ped ?? "—";

    templateData[`tlog_${slug}`] = semanaTL.dias[i]?.tlog ?? "—";
    templateData[`login_${slug}`] = semanaTL.dias[i]?.login ?? "—";
    templateData[`logout_${slug}`] = semanaTL.dias[i]?.deslog ?? "—";

    templateData[`indisp_${slug}`] = semanaIndisp.dias[i]?.indisp ?? "—";
    templateData[`nr17_${slug}`] = semanaIndisp.dias[i]?.nr17 ?? "—";
    templateData[`part_${slug}`] = semanaIndisp.dias[i]?.part ?? "—";
    templateData[`outras_${slug}`] = semanaIndisp.dias[i]?.outras ?? "—";
  }

  // TEMP DEBUG: remover depois de confirmar a causa dos valores "4" no Tempo Logado.
  console.log("[feedback/resultado-semanal] templateData:", JSON.stringify(templateData, null, 2));

  // Ler template — public/ é sempre incluído no deploy Vercel
  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "feedback_semanal_template.docx",
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

  const nomeArquivo = `Feedback_Semanal_${operador.trim().replace(/\s+/g, "_")}_${semanaConsolidado.periodo.replace(/\//g, "-")}.docx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
    },
  });
}
