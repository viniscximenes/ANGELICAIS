"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { KbConfig } from "../types";

export async function getConfigAction(): Promise<KbConfig | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("kb_config")
    .select("id, prompt_sistema, updated_at")
    .single();

  if (error) {
    console.error("[get-config] erro:", error);
    return null;
  }

  return {
    id: data.id,
    promptSistema: data.prompt_sistema,
    updatedAt: data.updated_at,
  };
}
