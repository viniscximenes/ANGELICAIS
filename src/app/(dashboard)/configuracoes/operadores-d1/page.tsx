import { redirect } from "next/navigation";

// Unificada em /configuracoes/equipe (roster + apelidos numa lista só).
// Mantida como redirect para não quebrar links salvos.
export default function LegacyConfigOperadoresD1Page() {
  redirect("/configuracoes/equipe");
}
