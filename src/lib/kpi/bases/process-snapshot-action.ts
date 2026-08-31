"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

import { getKpiDefinitions } from "../get-definitions";
import { extractSnapshot } from "./extract-snapshot";
import { parseClipboard } from "./parse-clipboard";
import { enforceRetention } from "./retention";
import { revalidateKpiSnapshots } from "./revalidate-kpi";
import { METADATA_SLUGS } from "./types";

type ProcessSnapshotInput = {
  clipboardText: string;
  mesRef: string;
  dataCorte: string;
  headerOverrides?: Record<string, string>;
};

export type ProcessSnapshotResult =
  | {
      success: true;
      totalOperators: number;
      cadastradosNoSistema: string[];
      naoCadastrados: string[];
      missingKpis: string[];
      missingKpisFull: Array<{
        slug: string;
        displayName: string;
        expectedHeader: string;
      }>;
      missingMetadata: string[];
      monthsDeleted: string[];
      detectedHeaders: string[];
      debugInfo: {
        separator: "TAB" | "VIRGULA";
        totalHeaders: number;
        rawFirstLineSample: string;
      };
      warnings: string[];
    }
  | { success: false; error: string };

export async function processSnapshotAction(
  input: ProcessSnapshotInput,
): Promise<ProcessSnapshotResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  if (!can(user.profile.role, "manage_base", user.profile.isAdminSkill)) {
    return { success: false, error: "Sem permissão para salvar KPIs" };
  }

  if (!input.mesRef.match(/^\d{4}-\d{2}-01$/)) {
    return { success: false, error: "Mês de referência inválido" };
  }
  if (!input.dataCorte.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { success: false, error: "Data de corte inválida" };
  }

  if (!input.clipboardText.trim()) {
    return { success: false, error: "Cole os dados primeiro" };
  }

  const parsed = parseClipboard(input.clipboardText);
  if (!parsed) {
    return { success: false, error: "Dados inválidos. Inclua o cabeçalho." };
  }

  const definitions = await getKpiDefinitions();
  const overridesMap = input.headerOverrides
    ? new Map(Object.entries(input.headerOverrides))
    : undefined;

  const extraction = extractSnapshot(parsed, definitions, overridesMap);

  if (extraction.operators.length === 0) {
    return {
      success: false,
      error:
        "Nenhum operador identificado. Verifique se a coluna Colaborador está presente.",
    };
  }

  const monthsDeleted = await enforceRetention(input.mesRef);

  const supabase = createAdminClient();
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("email_corporativo");

  if (profilesError) {
    console.error("[process-snapshot] erro lendo profiles:", profilesError);
    return { success: false, error: "Erro ao consultar perfis" };
  }

  const cadastradosSet = new Set(
    (profilesData || []).map((p) => p.email_corporativo.toLowerCase()),
  );

  const upsertRows: Array<{
    operator_email: string;
    mes_ref: string;
    data_corte: string;
    kpi_slug: string;
    valor_numerico: number | null;
    valor_texto: string | null;
  }> = [];

  const textSlugs = new Set<string>([
    METADATA_SLUGS.gestor,
    METADATA_SLUGS.status,
  ]);

  for (const op of extraction.operators) {
    for (const [slug, value] of op.values.entries()) {
      const isText = textSlugs.has(slug);

      upsertRows.push({
        operator_email: op.operatorEmail,
        mes_ref: input.mesRef,
        data_corte: input.dataCorte,
        kpi_slug: slug,
        valor_numerico: isText
          ? null
          : typeof value === "number"
            ? value
            : null,
        valor_texto: isText
          ? typeof value === "string"
            ? value
            : null
          : null,
      });
    }
  }

  const { error: upsertError } = await supabase
    .from("kpi_monthly_snapshots")
    .upsert(upsertRows, {
      onConflict: "operator_email,mes_ref,kpi_slug",
    });

  if (upsertError) {
    console.error("[process-snapshot] erro no upsert:", upsertError);
    return { success: false, error: "Erro ao salvar no banco" };
  }

  const cadastradosNoSistema: string[] = [];
  const naoCadastrados: string[] = [];

  for (const op of extraction.operators) {
    if (cadastradosSet.has(op.operatorEmail)) {
      cadastradosNoSistema.push(op.operatorEmail);
    } else {
      naoCadastrados.push(op.operatorEmail);
    }
  }

  revalidateKpiSnapshots();

  return {
    success: true,
    totalOperators: extraction.operators.length,
    cadastradosNoSistema: cadastradosNoSistema.sort(),
    naoCadastrados: naoCadastrados.sort(),
    missingKpis: extraction.missingKpis.map((k) => k.displayName),
    missingKpisFull: extraction.missingKpis.map((k) => ({
      slug: k.slug,
      displayName: k.displayName,
      expectedHeader: k.expectedHeader,
    })),
    missingMetadata: extraction.missingMetadata,
    monthsDeleted,
    detectedHeaders: parsed.headers,
    debugInfo: {
      separator: parsed.separator,
      totalHeaders: parsed.headers.length,
      rawFirstLineSample: parsed.rawFirstLineSample,
    },
    warnings: extraction.warnings,
  };
}
