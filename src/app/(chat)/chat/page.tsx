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

  // Apenas GESTOR tem acesso — OP/AUX são redirecionados aqui, e ADM nem
  // chega a esta checagem (bloqueado antes, no middleware — ver
  // src/lib/supabase/middleware.ts)
  if (!can(user.profile.role, "view_gestor_panel")) {
    redirect("/d-1/consolidado");
  }

  return <ChatWindow />;
}
