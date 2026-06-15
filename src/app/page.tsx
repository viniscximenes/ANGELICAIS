import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Mesma lógica do pós-login: cada role cai na sua landing por permissão
  // (RELATORIO em /d-1/consolidado, não em KPI).
  redirect(getPostLoginPath(user.profile.role));
}
