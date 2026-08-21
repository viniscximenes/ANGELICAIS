import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChatWindow } from "@/components/chat/chat-window";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Assistente — ANGELICAIS",
};

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Apenas GESTOR e ADM têm acesso — OP e AUX são redirecionados
  if (!can(user.profile.role, "view_gestor_panel")) {
    redirect("/d-1/consolidado");
  }

  return <ChatWindow />;
}
