/**
 * As 8 skills de retenção confirmadas — únicas que contam pra TMA. Todas as
 * outras skills do CDR (SAC, Suporte, Vendas, Cobrança, Triagem, Atex, etc.)
 * são ignoradas nesta feature.
 */
const SKILLS_RETENCAO_RAW = [
  "Skill_retenção_outros",
  "Skill_Giga_Retencao_Criticos",
  "Skill_retenção_mud_endereço",
  "Skill_retenção_financeiro",
  "Skill_retenção_qualidade_serviço",
  "Skill_retenção_concorrencia",
  "Skill_Retencao_Lojas_Hotline",
  "Skill_giga_voz_reversao_churn",
];

/** lowercase, sem acento, sem "-"/"_" — pra comparação tolerante a variação de grafia. */
export function normalizeSkill(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-_]/g, "");
}

const SKILLS_RETENCAO_NORMALIZADAS = new Set(SKILLS_RETENCAO_RAW.map(normalizeSkill));

export function isSkillRetencao(raw: string): boolean {
  return SKILLS_RETENCAO_NORMALIZADAS.has(normalizeSkill(raw));
}

/**
 * Coluna de "queda por skill" da tabela principal — 7 buckets (Hotline e
 * Churn somadas numa coluna só, por pedido da spec).
 */
export type SkillBucket =
  | "outros"
  | "criticos"
  | "mudEndereco"
  | "financeiro"
  | "qualidade"
  | "concorrencia"
  | "hotlineChurn";

const BUCKET_POR_SKILL_NORMALIZADA: Record<string, SkillBucket> = {
  [normalizeSkill("Skill_retenção_outros")]: "outros",
  [normalizeSkill("Skill_Giga_Retencao_Criticos")]: "criticos",
  [normalizeSkill("Skill_retenção_mud_endereço")]: "mudEndereco",
  [normalizeSkill("Skill_retenção_financeiro")]: "financeiro",
  [normalizeSkill("Skill_retenção_qualidade_serviço")]: "qualidade",
  [normalizeSkill("Skill_retenção_concorrencia")]: "concorrencia",
  [normalizeSkill("Skill_Retencao_Lojas_Hotline")]: "hotlineChurn",
  [normalizeSkill("Skill_giga_voz_reversao_churn")]: "hotlineChurn",
};

/** Bucket da coluna "queda por skill" pra uma skill de retenção já validada. */
export function bucketDaSkill(raw: string): SkillBucket | null {
  return BUCKET_POR_SKILL_NORMALIZADA[normalizeSkill(raw)] ?? null;
}

/** Label de exibição de cada bucket — mesmo texto usado nos headers da tabela principal. */
export const SKILL_BUCKET_LABELS: Record<SkillBucket, string> = {
  outros: "Outros",
  criticos: "Crítico",
  mudEndereco: "Mud. Endereço",
  financeiro: "Financeiro",
  qualidade: "Qualidade",
  concorrencia: "Concorrência",
  hotlineChurn: "Hotline + Churn",
};

export const SKILL_BUCKET_ORDER: SkillBucket[] = [
  "outros",
  "criticos",
  "mudEndereco",
  "financeiro",
  "qualidade",
  "concorrencia",
  "hotlineChurn",
];

export function zeroSkillBuckets(): Record<SkillBucket, number> {
  return {
    outros: 0,
    criticos: 0,
    mudEndereco: 0,
    financeiro: 0,
    qualidade: 0,
    concorrencia: 0,
    hotlineChurn: 0,
  };
}
