import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { IdleRefreshWatcher } from "@/components/d-1/idle-refresh-watcher";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function D1Layout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // GESTOR não acessa nenhuma sub-rota de /d-1
  if (user.profile.role === "GESTOR") {
    redirect("/gestor/d-1");
  }

  return (
    <>
      <IdleRefreshWatcher />
      {children}
    </>
  );
}
