// Script standalone de uso único. Renomeia os placeholders confusos
// (herdados de outro template) dentro de word/document.xml do novo
// template "Feedback Semanal Retenção Alloha Fibra" para casar com a
// convenção já usada no resto do projeto, e grava o resultado em
// public/templates/feedback_semanal_template.docx.
//
// Uso:
//   node scripts/build-feedback-semanal-template.cjs "<caminho-do-docx-original>"

const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const SOURCE_PATH = process.argv[2];
if (!SOURCE_PATH) {
  console.error("Uso: node scripts/build-feedback-semanal-template.cjs <caminho-do-docx-original>");
  process.exit(1);
}

const OUTPUT_PATH = path.join(__dirname, "..", "public", "templates", "feedback_semanal_template.docx");

const SUFFIXES = "seg|ter|qua|qui|sex|sab|total";

// Ordem: mais específico/longo primeiro (defesa em profundidade;
// o anchor em "{token" já evita a colisão pctind_/ind_ sozinho, já que
// o caractere logo após "{" em "{pctind_seg}" é "p", não "i").
const RENAMES = [
  ["pctind_", "outras_"],
  ["atend_", "logout_"],
  ["pausa_", "login_"],
  ["maior_", "part_"],
  ["ocor_", "nr17_"],
  ["log_", "tlog_"],
  ["ind_", "indisp_"],
];

const zip = new PizZip(fs.readFileSync(SOURCE_PATH));
let xml = zip.file("word/document.xml").asText();

for (const [from, to] of RENAMES) {
  const re = new RegExp(`\\{${from}(${SUFFIXES})\\}`, "g");
  const before = (xml.match(re) || []).length;
  if (before !== 7) {
    throw new Error(
      `Esperava 7 ocorrências de "{${from}*}" (6 dias + total), encontrei ${before}. Abortando — verifique o template.`,
    );
  }
  xml = xml.replace(re, (_m, suf) => `{${to}${suf}}`);
  console.log(`OK: {${from}*} -> {${to}*} (${before} ocorrências)`);
}

// Também varre header/footer por precaução — não deve encontrar nada,
// mas falha alto se encontrar em vez de silenciosamente ignorar.
for (const part of ["word/header.xml", "word/footer1.xml"]) {
  const entry = zip.file(part);
  if (!entry) continue;
  const text = entry.asText();
  for (const [from] of RENAMES) {
    const re = new RegExp(`\\{${from}(${SUFFIXES})\\}`, "g");
    if (re.test(text)) {
      throw new Error(`Encontrado token "{${from}*}" em ${part}, script não cobre esse arquivo. Ajustar antes de prosseguir.`);
    }
  }
}

zip.file("word/document.xml", xml);

// Buffer do TEMPLATE (placeholders renomeados, mas ainda não renderizados)
// — é isso que vai para o disco no final.
const templateBuf = zip.generate({ type: "nodebuffer" });

// Render de verificação em memória, numa cópia separada do zip — garante
// que o XML não ficou corrompido e que todos os tokens esperados resolvem,
// sem afetar o templateBuf (que precisa continuar não-renderizado).
const verifyDoc = new Docxtemplater(new PizZip(templateBuf), {
  paragraphLoop: true,
  linebreaks: true,
});
const dummy = { periodo: "x", operador: "x", supervisor: "x", data_feedback: "x" };
for (const slug of ["seg", "ter", "qua", "qui", "sex", "sab"]) {
  dummy[`dia_${slug}`] = "x";
  for (const k of ["tx", "ret", "canc", "ped", "tlog", "login", "logout", "indisp", "nr17", "part", "outras"]) {
    dummy[`${k}_${slug}`] = "x";
  }
}
for (const k of ["tx", "ret", "canc", "ped", "tlog", "login", "logout", "indisp", "nr17", "part", "outras"]) {
  dummy[`${k}_total`] = "x";
}
verifyDoc.render(dummy);
const renderedBuf = verifyDoc.getZip().generate({ type: "nodebuffer" });

const outXml = new PizZip(renderedBuf).file("word/document.xml").asText();
const leftover = outXml.match(/\{[a-zA-Z_]+\}/g);
if (leftover) {
  throw new Error(`Sobraram tokens não resolvidos após o render de verificação: ${leftover.join(", ")}`);
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, templateBuf);
console.log(`\nTemplate final gravado em: ${OUTPUT_PATH}`);
